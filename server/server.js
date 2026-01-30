import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load environment variables from .env file (DATABASE_URL, JWT_SECRET, etc.)
dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const ACCESS_TTL_SEC = 60 * 60 * 24; // 24 hours

// Helper to generate JWT
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL_SEC });
}

// Middleware to authenticate user based on Authorization header or sid cookie
async function authenticate(req, res, next) {
  let token = null;
  // Try reading token from Bearer header
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  // Fallback to cookie
  if (!token && req.cookies.sid) {
    token = req.cookies.sid;
  }
  if (!token) {
    return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ ok: false, error: 'INVALID_USER' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }
}

// Route: Register a new user. If no user exists, allow first signup. Later, only admin can create users.
app.post('/api/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'EMAIL_AND_PASSWORD_REQUIRED' });
  }
  // Check if any user exists
  const existingUsers = await prisma.user.findMany({ take: 1 });
  if (existingUsers.length > 0) {
    // Require authentication and admin role
    if (!req.user) {
      return res.status(403).json({ ok: false, error: 'ONLY_ADMIN_CAN_CREATE_USERS' });
    }
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'ADMIN_ROLE_REQUIRED' });
    }
  }
  // Make sure email is unique
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ ok: false, error: 'EMAIL_ALREADY_EXISTS' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const role = existingUsers.length === 0 ? 'ADMIN' : 'MEMBER';
  const user = await prisma.user.create({ data: { email, passwordHash, name, role } });
  // Return minimal user info
  return res.status(201).json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

// Route: Login and issue JWT
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'EMAIL_AND_PASSWORD_REQUIRED' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
  }
  const token = generateToken({ sub: user.id, role: user.role });
  // Set cookie for convenience
  res.cookie('sid', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TTL_SEC * 1000
  });
  return res.json({ ok: true, token, user: { id: user.id, email: user.email, role: user.role } });
});

// Route: Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('sid');
  return res.json({ ok: true });
});

// Route: Get current user profile
app.get('/api/me', authenticate, (req, res) => {
  const { id, email, name, role } = req.user;
  res.json({ ok: true, user: { id, email, name, role } });
});

// Example protected route to create workspace
app.post('/api/workspaces', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'NAME_REQUIRED' });
  // Only owners and admins can create workspaces
  if (!['ADMIN', 'OWNER'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'NOT_AUTHORIZED' });
  }
  const workspace = await prisma.workspace.create({ data: { name, ownerId: req.user.id } });
  // Also create membership record for the owner
  await prisma.workspaceMembership.create({ data: { userId: req.user.id, workspaceId: workspace.id, role: 'OWNER' } });
  res.status(201).json({ ok: true, workspace });
});

// Route: List workspaces the current user is a member of (or owns).
app.get('/api/workspaces', authenticate, async (req, res) => {
  try {
    // Fetch memberships and owned workspaces
    const memberships = await prisma.workspaceMembership.findMany({
      where: { userId: req.user.id },
      include: { workspace: true }
    });
    const owned = await prisma.workspace.findMany({ where: { ownerId: req.user.id } });
    // Merge and deduplicate
    const combined = [...owned, ...memberships.map(m => m.workspace)];
    const unique = Object.values(
      combined.reduce((acc, ws) => {
        acc[ws.id] = ws;
        return acc;
      }, {})
    );
    res.json(unique);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'FAILED_TO_LIST_WORKSPACES' });
  }
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});