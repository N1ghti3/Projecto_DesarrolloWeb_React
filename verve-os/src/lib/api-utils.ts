// VerveOS - Helpers de API: respuestas, manejo de errores, emisor WS, device sessions
import { NextResponse } from 'next/server'
import { verifyAccessToken, JwtUser, STAFF_ROLES } from './auth'
import { db } from './db'

// Respuesta JSON estándar
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

// Extrae y verifica el JWT desde el header Authorization
export function getUserFromRequest(req: Request): JwtUser | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!auth) return null
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  return verifyAccessToken(match[1])
}

// Requiere autenticación
export function requireAuth(req: Request): { user: JwtUser; error?: never } | { user?: never; error: NextResponse } {
  const user = getUserFromRequest(req)
  if (!user) {
    return { error: fail('No autorizado. Token inválido o ausente.', 401) }
  }
  return { user }
}

// Requiere rol de admin
export function requireAdmin(req: Request): { user: JwtUser; error?: never } | { user?: never; error: NextResponse } {
  const result = requireAuth(req)
  if ('error' in result) return result
  if (result.user.role !== 'admin') {
    return { error: fail('Acceso denegado. Se requiere rol de administrador.', 403) }
  }
  return { user: result.user }
}

// Requiere rol de staff (admin, mesero, cajero)
export function requireStaff(req: Request): { user: JwtUser; error?: never } | { user?: never; error: NextResponse } {
  const result = requireAuth(req)
  if ('error' in result) return result
  if (!STAFF_ROLES.includes(result.user.role)) {
    return { error: fail('Acceso denegado. Se requiere rol de staff.', 403) }
  }
  return { user: result.user }
}

// Verifica un device token de kiosk (sesión de mesa abierta).
// Devuelve la sesión + mesa si es válida.
export async function requireDeviceSession(
  req: Request
): Promise<
  | { session: { id: string; tableId: string; token: string }; error?: never }
  | { session?: never; error: NextResponse }
> {
  const token = req.headers.get('x-device-token') || req.headers.get('X-Device-Token')
  if (!token) {
    return { error: fail('Device token requerido', 401) }
  }
  const session = await db.deviceSession.findFirst({
    where: { token: String(token), active: true },
  })
  if (!session) {
    return { error: fail('Sesión de dispositivo inválida o cerrada', 401) }
  }
  return { session: { id: session.id, tableId: session.tableId, token: session.token } }
}

// Acepta autenticación EITHER por JWT de staff OR por device token de kiosk.
// Para endpoints que el cliente kiosk y el staff pueden usar (ej. crear orden).
export async function requireAnyAuth(
  req: Request
): Promise<
  | { user: JwtUser | null; session: { tableId: string } | null; error?: never }
  | { user?: never; session?: never; error: NextResponse }
> {
  // Intentar JWT primero
  const jwtUser = getUserFromRequest(req)
  if (jwtUser) return { user: jwtUser, session: null }

  // Sino, device token
  const dev = await requireDeviceSession(req)
  if ('session' in dev && dev.session) return { user: null, session: { tableId: dev.session.tableId } }

  return { error: fail('No autorizado. Se requiere JWT o device token.', 401) }
}

// Shared secret para comunicación interna con el WebSocket
function getWsInternalSecret(): string {
  return process.env.WS_INTERNAL_SECRET || ''
}

// Envía un evento al mini-service WebSocket
export async function emitWsEvent(event: string, orderId: string) {
  try {
    const base = process.env.INTERNAL_WS_EMITTER_URL
    const secret = getWsInternalSecret()
    if (!base) {
      console.warn('[VerveOS] INTERNAL_WS_EMITTER_URL no configurado')
      return
    }
    const res = await fetch(`${base}/__emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ event, orderId }),
    })
    if (!res.ok) {
      console.warn(`[VerveOS] emitWsEvent respondió ${res.status}`)
    }
  } catch (err) {
    console.warn('[VerveOS] No se pudo emitir evento WS:', err)
  }
}

// Emite un evento genérico (no ligado a una orden) al WS: waiter-call, table-update, etc.
export async function emitWsBroadcast(event: string, payload: unknown, rooms?: string[]) {
  try {
    const base = process.env.INTERNAL_WS_EMITTER_URL
    const secret = getWsInternalSecret()
    if (!base) {
      console.warn('[VerveOS] INTERNAL_WS_EMITTER_URL no configurado')
      return
    }
    await fetch(`${base}/__broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ event, payload, rooms }),
    })
  } catch (err) {
    console.warn('[VerveOS] No se pudo emitir broadcast WS:', err)
  }
}

// Obtiene la tasa de IVA configurada (default 19)
export async function getTaxRate(): Promise<number> {
  const setting = await db.setting.findUnique({ where: { key: 'tax_rate' } })
  return setting ? Number(setting.value) : 19
}

// In-memory rate limiter (simple, single-process)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }
  entry.count++
  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0 }
  }
  return { allowed: true, remaining: maxAttempts - entry.count }
}

// Manejador de errores
export function handleRouteError(err: unknown) {
  console.error('[VerveOS] Error en ruta:', err)
  const isDev = process.env.NODE_ENV === 'development'
  const message = err instanceof Error && isDev ? err.message : 'Error interno del servidor'
  return fail(message, 500)
}
