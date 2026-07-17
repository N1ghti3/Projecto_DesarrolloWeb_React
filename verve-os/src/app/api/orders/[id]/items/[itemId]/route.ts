// PATCH /api/orders/:id/items/:itemId - Cambia el estado de un item individual
// Body: { status: "pendiente" | "en_preparacion" | "listo" | "cancelado" }
// Si el item se cancela, restaura el stock del producto.
import { db } from '@/lib/db'
import { requireAuth, ok, fail, handleRouteError, emitWsEvent } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const VALID = ['pendiente', 'en_preparacion', 'listo', 'cancelado']

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const { id, itemId } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body || !body.status) return fail('status es obligatorio', 422)
    const status = String(body.status)
    if (!VALID.includes(status)) return fail(`Estado inválido. Válidos: ${VALID.join(', ')}`, 422)

    const item = await db.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true, product: true },
    })
    if (!item || item.orderId !== id) return fail('Item no encontrado en la orden', 404)

    const wasCancelled = item.status === 'cancelado'
    const becomingCancelled = status === 'cancelado' && !wasCancelled

    await db.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: itemId }, data: { status } })
      // Restaurar stock si se cancela el item
      if (becomingCancelled) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        })
        // Si vuelve a tener stock, marcar disponible
        if (product.stock > 0) {
          await tx.product.update({ where: { id: item.productId }, data: { available: true } })
        }
      }
    })

    await emitWsEvent('item:status', id)

    return ok({ itemId, status, orderId: id })
  } catch (err) {
    return handleRouteError(err)
  }
}
