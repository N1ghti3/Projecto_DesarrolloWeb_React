// PATCH /api/menu/:id/availability - Cambia disponibilidad de un producto (86)
// Body: { available: boolean }. Emite broadcast 'menu:update' a todos los kiosks.
import { db } from '@/lib/db'
import { requireStaff, ok, fail, handleRouteError, emitWsBroadcast } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireStaff(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body || typeof body.available !== 'boolean') {
      return fail('available (boolean) es obligatorio', 422)
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) return fail('Producto no encontrado', 404)

    const updated = await db.product.update({
      where: { id },
      data: { available: body.available },
    })

    // Broadcast a todos los kiosks para que actualicen el menú
    await emitWsBroadcast('menu:update', {
      productId: id,
      name: updated.name,
      available: updated.available,
      stock: updated.stock,
    })

    return ok({ product: { id: updated.id, name: updated.name, available: updated.available, stock: updated.stock } })
  } catch (err) {
    return handleRouteError(err)
  }
}
