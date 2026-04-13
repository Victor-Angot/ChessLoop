import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'session'

export { COOKIE_NAME }

export interface JwtPayload {
  sub: string
  email: string
}

export function signSessionToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set and at least 16 characters')
  }
  return jwt.sign({ sub: userId, email }, secret, {
    expiresIn: '7d',
    algorithm: 'HS256',
  })
}

export function verifySessionToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload & JwtPayload
    if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
      return null
    }
    return { sub: decoded.sub, email: decoded.email }
  } catch {
    return null
  }
}

export function cookieOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  maxAge: number
  path: string
} {
  const isProd = process.env.NODE_ENV === 'production'
  const trustHttp = process.env.TRUST_HTTP_COOKIES === '1'
  return {
    httpOnly: true,
    secure: isProd && !trustHttp,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  }
}
