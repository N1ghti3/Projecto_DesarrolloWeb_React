import { db } from '@/lib/db'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) return fail('Cuerpo requerido', 422)

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) return fail('Categoría no encontrada', 404)

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = String(body.name).trim()
      const dup = await db.category.findFirst({ where: { name, NOT: { id } } })
      if (dup) return fail('Ya existe una categoría con ese nombre', 409)
      data.name = name
    }
    if (body.emoji !== undefined) data.emoji = String(body.emoji).trim()
    if (body.station !== undefined) {
      if (!['cocina', 'barra'].includes(body.station)) return fail('station debe ser cocina o barra', 422)
      data.station = body.station
    }
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)

    const category = await db.category.update({ where: { id }, data })
    return ok({ category })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) return fail('Categoría no encontrada', 404)

    await db.category.delete({ where: { id } })
    return ok({ deleted: id })
  } catch (err) {
    return handleRouteError(err)
  }
}
