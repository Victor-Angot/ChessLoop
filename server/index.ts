import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Request, type Response, type NextFunction } from 'express'
import { isAdminEmail } from './adminConfig.js'
import { createAppStore, type AppStore } from './appStore.js'
import { normalizeEmail, type UserRow } from './db.js'
import {
  isMailConfigured,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from './mail.js'
import {
  COOKIE_NAME,
  cookieOptions,
  signSessionToken,
  verifySessionToken,
  type JwtPayload,
} from './tokens.js'
import type { TrainerChessLine, TrainerRepertoire } from './trainerTypes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret.length < 16) {
  console.error(
    'Set JWT_SECRET in .env (at least 16 characters). See env.example in the project root.',
  )
  process.exit(1)
}

const PORT = Number(process.env.PORT ?? 3001)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const API_PUBLIC_URL = process.env.API_PUBLIC_URL ?? FRONTEND_ORIGIN
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const SERVE_STATIC = process.env.SERVE_STATIC === '1'

export interface AuthedRequest extends Request {
  auth?: JwtPayload
}

function readBearerOrCookie(req: Request): string | undefined {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const c = req.cookies?.[COOKIE_NAME]
  return typeof c === 'string' ? c : undefined
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readBearerOrCookie(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const payload = verifySessionToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  req.auth = payload
  next()
}

function publicUser(row: UserRow, admin: boolean): {
  id: string
  email: string
  created_at: string
  is_admin: boolean
} {
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at,
    is_admin: admin,
  }
}

async function safeRecordLogin(store: AppStore, userId: string): Promise<void> {
  try {
    await store.recordLogin(userId)
  } catch (err) {
    console.error('[analytics] recordLogin failed:', err)
  }
}

function setSessionCookie(res: Response, userId: string, email: string): void {
  const token = signSessionToken(userId, email)
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

function mountApi(app: express.Application, store: AppStore): void {
  app.set('trust proxy', 1)
  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use(cookieParser())

  app.post('/api/auth/register', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }
    if (await store.getUserByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists' })
      return
    }
    const hash = bcrypt.hashSync(password, 12)
    const user = await store.createUserWithPassword(email, hash)
    setSessionCookie(res, user.id, user.email)
    const confirmationEmailSent = isMailConfigured()
    res.status(201).json({
      user: publicUser(user, isAdminEmail(user.email)),
      confirmationEmailSent,
    })
    void safeRecordLogin(store, user.id)
    if (confirmationEmailSent) {
      void sendSignupConfirmationEmail(user.email).catch((err) => {
        console.error('[mail] confirmation:', err)
      })
    }
  })

  app.post('/api/auth/forgot-password', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : ''
    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }
    const user = await store.getUserByEmail(email)
    if (user?.password_hash) {
      const token = randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      await store.setPasswordResetToken(user.id, token, expires)
      const resetUrl = `${FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`
      if (isMailConfigured()) {
        void sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
          console.error('[mail] reset:', err)
        })
      } else {
        console.warn(
          '[mail] SMTP not configured — password reset link (dev only):',
          resetUrl,
        )
      }
    }
    res.json({ ok: true })
  })

  app.post('/api/auth/reset-password', async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }
    const user = await store.getUserByPasswordResetToken(token)
    if (!user) {
      res.status(400).json({ error: 'Invalid or expired reset link' })
      return
    }
    const hash = bcrypt.hashSync(password, 12)
    await store.updateUserPasswordHash(user.id, hash)
    await store.clearPasswordResetFields(user.id)
    setSessionCookie(res, user.id, user.email)
    res.json({ user: publicUser(user, isAdminEmail(user.email)) })
    void safeRecordLogin(store, user.id)
  })

  app.post('/api/auth/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }
    const user = await store.getUserByEmail(email)
    if (!user?.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }
    setSessionCookie(res, user.id, user.email)
    res.json({ user: publicUser(user, isAdminEmail(user.email)) })
    void safeRecordLogin(store, user.id)
  })

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res)
    res.json({ ok: true })
  })

  app.get('/api/auth/me', async (req, res) => {
    const token = readBearerOrCookie(req)
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const payload = verifySessionToken(token)
    if (!payload) {
      clearSessionCookie(res)
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const user = await store.getUserById(payload.sub)
    if (!user) {
      clearSessionCookie(res)
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.json({ user: publicUser(user, isAdminEmail(user.email)) })
  })

  app.get('/api/auth/providers', (_req, res) => {
    res.json({
      google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    })
  })

  app.get('/api/auth/google', (_req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: 'Google sign-in is not configured' })
      return
    }
    const redirectUri = `${API_PUBLIC_URL}/api/auth/google/callback`
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
    })
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  })

  app.get('/api/auth/google/callback', async (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_config`)
      return
    }
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const err = typeof req.query.error === 'string' ? req.query.error : ''
    if (err) {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_denied`)
      return
    }
    if (!code) {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_missing_code`)
      return
    }
    const redirectUri = `${API_PUBLIC_URL}/api/auth/google/callback`
    let tokens: { access_token?: string }
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      if (!tokenRes.ok) {
        res.redirect(`${FRONTEND_ORIGIN}/login?error=google_token`)
        return
      }
      tokens = (await tokenRes.json()) as { access_token?: string }
    } catch {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_network`)
      return
    }
    const accessToken = tokens.access_token
    if (!accessToken) {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_token`)
      return
    }
    let profile: { sub?: string; email?: string; email_verified?: boolean }
    try {
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!userRes.ok) {
        res.redirect(`${FRONTEND_ORIGIN}/login?error=google_profile`)
        return
      }
      profile = (await userRes.json()) as {
        sub?: string
        email?: string
        email_verified?: boolean
      }
    } catch {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_network`)
      return
    }
    const googleSub = profile.sub
    const emailRaw = profile.email
    if (!googleSub || !emailRaw || profile.email_verified === false) {
      res.redirect(`${FRONTEND_ORIGIN}/login?error=google_email`)
      return
    }
    const email = normalizeEmail(emailRaw)

    let user = await store.getUserByGoogleSub(googleSub)
    if (user) {
      setSessionCookie(res, user.id, user.email)
      void safeRecordLogin(store, user.id)
      res.redirect(`${FRONTEND_ORIGIN}/`)
      return
    }

    const byEmail = await store.getUserByEmail(email)
    if (byEmail) {
      if (byEmail.google_sub && byEmail.google_sub !== googleSub) {
        res.redirect(`${FRONTEND_ORIGIN}/login?error=google_link_conflict`)
        return
      }
      if (!byEmail.google_sub) {
        await store.linkGoogleToUser(byEmail.id, googleSub)
      }
      user = (await store.getUserById(byEmail.id))!
      setSessionCookie(res, user.id, user.email)
      void safeRecordLogin(store, user.id)
      res.redirect(`${FRONTEND_ORIGIN}/`)
      return
    }

    user = await store.createUserGoogleOnly(email, googleSub)
    setSessionCookie(res, user.id, user.email)
    void safeRecordLogin(store, user.id)
    if (isMailConfigured()) {
      void sendSignupConfirmationEmail(user.email).catch((err) => {
        console.error('[mail] confirmation (google):', err)
      })
    }
    res.redirect(`${FRONTEND_ORIGIN}/`)
  })

  app.get(
    '/api/admin/analytics',
    requireAuth,
    async (req: AuthedRequest, res) => {
      if (!isAdminEmail(req.auth!.email)) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      try {
        const summary = await store.getAnalyticsSummary()
        res.json(summary)
      } catch (err) {
        console.error('[admin/analytics]', err)
        res.status(500).json({ error: 'Could not load analytics' })
      }
    },
  )

  app.get('/api/protected/ping', requireAuth, (req: AuthedRequest, res) => {
    res.json({ ok: true, userId: req.auth?.sub })
  })

  app.get('/api/trainer/snapshot', requireAuth, async (req: AuthedRequest, res) => {
    const uid = req.auth!.sub
    const snap = await store.trainerSnapshot(uid)
    res.json(snap)
  })

  app.put('/api/trainer/repertoires', requireAuth, async (req: AuthedRequest, res) => {
    const raw = req.body?.repertoires
    if (!Array.isArray(raw)) {
      res.status(400).json({ error: 'repertoires must be an array' })
      return
    }
    const uid = req.auth!.sub
    for (const r of raw) {
      await store.trainerUpsertRepertoire(uid, r as TrainerRepertoire)
    }
    res.json({ ok: true })
  })

  app.put('/api/trainer/lines', requireAuth, async (req: AuthedRequest, res) => {
    const raw = req.body?.lines
    if (!Array.isArray(raw)) {
      res.status(400).json({ error: 'lines must be an array' })
      return
    }
    const uid = req.auth!.sub
    for (const line of raw) {
      await store.trainerUpsertLine(uid, line as TrainerChessLine)
    }
    res.json({ ok: true })
  })

  app.delete('/api/trainer/repertoires/:id', requireAuth, async (req: AuthedRequest, res) => {
    const uid = req.auth!.sub
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'Missing id' })
      return
    }
    await store.trainerDeleteRepertoire(uid, id)
    res.json({ ok: true })
  })
}

async function main(): Promise<void> {
  const store = await createAppStore()
  const app = express()
  mountApi(app, store)

  if (SERVE_STATIC) {
    const dist = path.join(__dirname, '../dist')
    app.use(express.static(dist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(dist, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  }

  app.listen(PORT, () => {
    console.log(
      `API listening on http://localhost:${PORT} (${store.kind})${SERVE_STATIC ? ' + static /dist' : ''}`,
    )
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
