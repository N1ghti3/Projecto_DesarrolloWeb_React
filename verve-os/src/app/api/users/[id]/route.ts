import { db } from '@/lib/db'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'mesero', 'barra', 'cocina', 'cajero', 'visor', 'mesa']

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) return fail('Cuerpo requerido', 422)

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return fail('Usuario no encontrado', 404)

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = String(body.name).trim()
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase()
      const dup = await db.user.findFirst({ where: { email, NOT: { id } } })
      if (dup) return fail('Ya existe un usuario con ese email', 409)
      data.email = email
    }
    if (body.password !== undefined) {
      data.passwordHash = await hashPassword(String(body.password))
    }
    if (body.pin !== undefined) data.pin = String(body.pin).slice(0, 4) || null
    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) return fail('Rol inválido', 422)
      data.role = body.role
    }
    if (body.active !== undefined) data.active = Boolean(body.active)

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, pin: true, active: true, updatedAt: true },
    })

    return ok({ user })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return fail('Usuario no encontrado', 404)

    if (existing.role === 'admin') {
      const adminCount = await db.user.count({ where: { role: 'admin', active: true } })
      if (adminCount <= 1) return fail('No puedes desactivar al único administrador', 422)
    }

    await db.user.update({ where: { id }, data: { active: false } })

    return ok({ deleted: id })
  } catch (err) {
    return handleRouteError(err)
  }
}
