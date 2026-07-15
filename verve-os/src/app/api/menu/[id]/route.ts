// PUT    /api/menu/:id  - Actualiza producto (solo admin)
// DELETE /api/menu/:id  - Elimina producto (solo admin)
import { db } from '@/lib/db'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body) return fail('Cuerpo de petición inválido', 422)

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return fail('Producto no encontrado', 404)

    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        description: body.description !== undefined ? String(body.description).trim() : undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        category: body.category !== undefined ? String(body.category).trim() : undefined,
        station: body.station !== undefined ? (body.station === 'barra' ? 'barra' : 'cocina') : undefined,
        stock: body.stock !== undefined ? Number(body.stock) : undefined,
        imageUrl: body.imageUrl !== undefined ? (body.imageUrl ? String(body.imageUrl) : null) : undefined,
        available: body.available !== undefined ? Boolean(body.available) : undefined,
      },
    })

    return ok({ product })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return fail('Producto no encontrado', 404)

    await db.product.delete({ where: { id } })
    return ok({ deleted: id })
  } catch (err) {
    return handleRouteError(err)
  }
}
