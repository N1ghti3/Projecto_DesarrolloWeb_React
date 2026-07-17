// POST /api/auth/login - Autenticación con email + password
import { db } from '@/lib/db'
import { comparePassword, issueTokens } from '@/lib/auth'
import { ok, fail, handleRouteError, checkRateLimit } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit(`login:${ip}`, 10, 60000)
    if (!rl.allowed) {
      return fail('Demasiados intentos. Intenta de nuevo en un minuto.', 429)
    }

    const body = await req.json().catch(() => null)
    if (!body || !body.email || !body.password) {
      return fail('Email y contraseña son obligatorios', 422)
    }

    const user = await db.user.findUnique({ where: { email: String(body.email).toLowerCase().trim() } })
    if (!user) {
      return fail('Credenciales inválidas', 401)
    }

    const valid = await comparePassword(body.password, user.passwordHash)
    if (!valid) {
      return fail('Credenciales inválidas', 401)
    }

    const safe = { id: user.id, name: user.name, email: user.email, role: user.role }
    const tokens = issueTokens(safe)

    return ok({ user: safe, ...tokens })
  } catch (err) {
    return handleRouteError(err)
  }
}
