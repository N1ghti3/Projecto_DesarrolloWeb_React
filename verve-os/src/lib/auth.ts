// VerveOS - Librería de autenticación (JWT + bcrypt + PIN + device sessions)
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'verveos-dev-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'verveos-dev-refresh-secret-change'
const ACCESS_EXPIRES = '15m'
const REFRESH_EXPIRES = '7d'

export interface JwtUser {
  id: string
  email: string
  role: string
  name: string
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function signAccessToken(user: JwtUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  )
}

export function signRefreshToken(user: JwtUser): string {
  return jwt.sign({ sub: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  })
}

export function verifyAccessToken(token: string): JwtUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    }
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): { id: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any
    if (decoded.type !== 'refresh') return null
    return { id: decoded.sub }
  } catch {
    return null
  }
}

export function issueTokens(user: JwtUser) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  }
}

// Genera un token aleatorio para sesiones de dispositivo kiosk
export function generateDeviceToken(): string {
  return (
    'dev_' +
    Array.from({ length: 40 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('')
  )
}

// Verifica un PIN de staff contra los usuarios con ese PIN.
export async function verifyPin(pin: string): Promise<JwtUser | null> {
  if (!pin || pin.length !== 4) return null
  const user = await db.user.findFirst({ where: { pin } })
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

// Staff roles que pueden abrir mesas / acceder a funciones admin en kiosk
export const STAFF_ROLES = ['admin', 'mesero', 'cajero']
