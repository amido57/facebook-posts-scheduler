import 'dotenv/config'
import path from 'path'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { makeJwt, setAuthCookie, clearAuthCookie, requireAuth } from './lib/auth.js'
import { registerSchema, loginSchema, connectFbSchema, scheduleTextSchema } from './lib/validate.js'
import { fetchPages, fetchScheduled, scheduleText } from './lib/facebook.js'

const prisma = new PrismaClient()
const app = express()

app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// In-memory Session for FB token
const fbSessionByUserId = new Map()

// Utils
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.pbkdf2Sync(pw, salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${derived}`
}
function verifyPassword(pw, stored) {
  const [salt, derived] = String(stored).split(':')
  const check = crypto.pbkdf2Sync(pw, salt, 120000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(derived))
}

// Privacy pages
app.get('/privacy', (req, res) => {
  res.type('html').send(`
  <h1>Privacy Policy</h1>
  <p>We store the minimum data needed to operate the service.</p>
  <p>Facebook access tokens are kept in memory only.</p>
  <p>Contact: support@yourdomain.com</p>
  `)
})

app.get('/data-deletion', (req, res) => {
  res.type('html').send(`
  <h1>Data Deletion Instructions</h1>
  <p>Email: support@yourdomain.com from your account email.</p>
  `)
})

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Auth
app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() })

  const { email, password, name } = parsed.data
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(409).json({ ok: false, error: 'EMAIL_EXISTS' })

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: hashPassword(password),
      role: 'OWNER',
      workspace: {
        create: {
          name: `${email.split('@')[0]}'s Workspace`
        }
      }
    },
    include: { workspace: true }
  })

  const token = makeJwt({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET || '')
  setAuthCookie(res, token)
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId: user.workspace?.id } })
})

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() })

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email }, include: { workspace: true } })
  if (!user) return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' })
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' })

  const token = makeJwt({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET || '')
  setAuthCookie(res, token)
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, workspaceId: user.workspace?.id } })
})

app.post('/api/auth/logout', async (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

app.get('/api/me', requireAuth(prisma), async (req, res) => {
  const ws = await prisma.workspace.findUnique({ where: { ownerId: req.user.id } })
  res.json({ ok: true, user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, workspaceId: ws?.id } })
})

// Facebook
app.post('/api/fb/connect', requireAuth(prisma), async (req, res) => {
  const parsed = connectFbSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() })

  fbSessionByUserId.set(req.user.id, {
    userAccessToken: parsed.data.userAccessToken,
    pagesCache: null,
    selectedPage: null
  })
  res.json({ ok: true })
})

app.post('/api/fb/disconnect', requireAuth(prisma), async (req, res) => {
  fbSessionByUserId.delete(req.user.id)
  res.json({ ok: true })
})

app.get('/api/fb/pages', requireAuth(prisma), async (req, res) => {
  const s = fbSessionByUserId.get(req.user.id)
  if (!s?.userAccessToken) return res.status(400).json({ ok: false, error: 'FB_NOT_CONNECTED' })

  const data = await fetchPages(s.userAccessToken)
  s.pagesCache = data.data || []
  res.json({ ok: true, pages: s.pagesCache })
})

app.post('/api/fb/select-page', requireAuth(prisma), async (req, res) => {
  const { pageId } = req.body || {}
  const s = fbSessionByUserId.get(req.user.id)
  if (!s?.pagesCache?.length) return res.status(400).json({ ok: false, error: 'FETCH_PAGES_FIRST' })

  const page = s.pagesCache.find(p => p.id === pageId)
  if (!page) return res.status(404).json({ ok: false, error: 'PAGE_NOT_FOUND' })
  s.selectedPage = page
  res.json({ ok: true, page })
})

app.get('/api/fb/scheduled-times', requireAuth(prisma), async (req, res) => {
  const s = fbSessionByUserId.get(req.user.id)
  if (!s?.selectedPage?.id || !s?.selectedPage?.access_token) return res.status(400).json({ ok: false, error: 'PAGE_NOT_SELECTED' })

  const out = await fetchScheduled(s.selectedPage.id, s.selectedPage.access_token)
  const times = (out.data || []).map(p => p.scheduled_publish_time * 1000)
  res.json({ ok: true, times })
})

// Scheduler
app.post('/api/schedule/text', requireAuth(prisma), async (req, res) => {
  const parsed = scheduleTextSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'BAD_REQUEST', details: parsed.error.flatten() })

  const s = fbSessionByUserId.get(req.user.id)
  if (!s?.selectedPage?.id || !s?.selectedPage?.access_token) return res.status(400).json({ ok: false, error: 'PAGE_NOT_SELECTED' })

  const result = await scheduleText({
    pageId: parsed.data.pageId,
    pageToken: s.selectedPage.access_token,
    message: parsed.data.message,
    scheduledAt: parsed.data.scheduledAt
  })

  res.json({ ok: true, result })
})

// Serve React
const __dirname = path.dirname(new URL(import.meta.url).pathname)
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Server running on ${PORT}`))
