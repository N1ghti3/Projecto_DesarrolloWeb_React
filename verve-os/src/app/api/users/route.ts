import { db } from '@/lib/db'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'
import { hashPassword } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const users = await db.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return ok({ users })
  } catch (err) {
    return handleRouteError(err)
  }
}

const VALID_ROLES = ['admin', 'mesero', 'barra', 'cocina', 'cajero', 'visor', 'mesa']

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !body.name || !body.email || !body.password) {
      return fail('name, email y password son obligatorios', 422)
    }

    const name = String(body.name).trim()
    const email = String(body.email).trim().toLowerCase()
    const password = String(body.password)
    const role = VALID_ROLES.includes(body.role) ? body.role : 'mesero'
    const pin = body.pin ? String(body.pin).slice(0, 4) : null

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return fail('Ya existe un usuario con ese email', 409)

    const passwordHash = await hashPassword(password)
    const pinHash = pin ? await bcrypt.hash(pin, 12) : null

    const user = await db.user.create({
      data: { name, email, passwordHash, pin: pinHash, role, active: true },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })

    return ok({ user }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
