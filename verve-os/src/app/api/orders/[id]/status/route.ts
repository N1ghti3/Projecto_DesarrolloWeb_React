// PATCH /api/orders/:id/status - Cambia el estado de una orden
import { db } from '@/lib/db'
import { requireAuth, ok, fail, handleRouteError, emitWsEvent } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    if (!body || !body.status) {
      return fail('status es obligatorio', 422)
    }

    const status = String(body.status)
    if (!VALID_STATUSES.includes(status)) {
      return fail(`Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}`, 422)
    }

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) return fail('Orden no encontrada', 404)

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    })

    // Emitir actualización a la barra
    await emitWsEvent('order:status', order.id)

    const payload = {
      id: order.id,
      tableId: order.tableId,
      status: order.status,
      total: order.total,
      notes: order.notes,
      source: order.source,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name ?? 'Producto eliminado',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
      })),
    }

    return ok({ order: payload })
  } catch (err) {
    return handleRouteError(err)
  }
}
