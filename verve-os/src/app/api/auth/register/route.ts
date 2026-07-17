// POST /api/auth/register - Registro de nuevos usuarios (solo admin)
import { db } from '@/lib/db'
import { hashPassword, issueTokens } from '@/lib/auth'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'mesero', 'barra', 'cocina', 'cajero', 'visor', 'mesa']

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !body.email || !body.password || !body.name) {
      return fail('Nombre, email y contraseña son obligatorios', 422)
    }

    const email = String(body.email).toLowerCase().trim()
    const name = String(body.name).trim()
    const password = String(body.password)
    const role = body.role && VALID_ROLES.includes(body.role) ? body.role : 'mesero'

    if (password.length < 6) {
      return fail('La contraseña debe tener al menos 6 caracteres', 422)
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return fail('Ya existe un usuario con ese email', 409)
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, passwordHash, role },
    })

    const safe = { id: user.id, name: user.name, email: user.email, role: user.role }

    return ok({ user: safe }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
