// VerveOS - Librería de autenticación (JWT + bcrypt + PIN + device sessions)
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from './db'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Falta variable de entorno: ${name}`)
  return val
}

const JWT_SECRET = requireEnv('JWT_SECRET')
const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET')
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

// Genera un token criptográficamente seguro para sesiones de dispositivo kiosk
export function generateDeviceToken(): string {
  return 'dev_' + crypto.randomBytes(30).toString('hex')
}

// Verifica un PIN de staff contra los usuarios con PIN hasheado.
export async function verifyPin(pin: string): Promise<JwtUser | null> {
  if (!pin || pin.length !== 4) return null
  const users = await db.user.findMany({ where: { pin: { not: null } } })
  for (const user of users) {
    if (user.pin && (await bcrypt.compare(pin, user.pin))) {
      return { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  }
  return null
}

// Staff roles que pueden abrir mesas / acceder a funciones admin en kiosk
export const STAFF_ROLES = ['admin', 'mesero', 'cajero']
