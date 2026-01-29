import { verifyToken } from "../lib/jwt.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.auth;
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (req.user.role !== role) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}
