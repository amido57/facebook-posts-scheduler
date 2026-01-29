import crypto from 'crypto'

const ACCESS_TTL_SEC = 60 * 60 // 1 hour
const COOKIE_NAME = 'sid'

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function signHmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}

export function makeJwt(payload, secret, ttlSec = ACCESS_TTL_SEC) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + ttlSec }

  const h = base64url(JSON.stringify(header))
  const b = base64url(JSON.stringify(body))
  const toSign = `${h}.${b}`
  const sig = signHmac(toSign, secret)
  return `${toSign}.${sig}`
}

export function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, b, sig] = parts
  const toSign = `${h}.${b}`
  const expected = signHmac(toSign, secret)
  if (expected !== sig) return null

  let payload
  try {
    payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && now > payload.exp) return null
  return payload
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SEC * 1000
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function getAuthToken(req) {
  return req.cookies?.[COOKIE_NAME] || null
}

export function requireAuth(prisma) {
  return async (req, res, next) => {
    const token = getAuthToken(req)
    const payload = verifyJwt(token, process.env.JWT_ACCESS_SECRET || '')
    if (!payload?.sub) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })

    req.user = user
    next()
  }
}
