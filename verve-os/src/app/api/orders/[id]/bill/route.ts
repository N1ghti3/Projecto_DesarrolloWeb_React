// POST /api/orders/:id/bill - Genera la cuenta y cierra la orden (pago).
// Body: { tip?: number, paymentMethod?: "efectivo"|"tarjeta"|"transferencia" }
// Calcula el total final (subtotal + propina) y marca la orden como "pagado".
import { db } from '@/lib/db'
import { requireAuth, ok, fail, handleRouteError, emitWsEvent } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const VALID_PAYMENTS = ['efectivo', 'tarjeta', 'transferencia']

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))

    const tip = Math.max(0, Number(body.tip ?? 0))
    const paymentMethod = body.paymentMethod
      ? VALID_PAYMENTS.includes(body.paymentMethod)
        ? body.paymentMethod
        : null
      : null

    const existing = await db.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })
    if (!existing) return fail('Orden no encontrada', 404)

    if (existing.status === 'pagado') {
      return fail('La orden ya fue pagada', 422)
    }
    if (existing.status === 'cancelado') {
      return fail('No se puede cobrar una orden cancelada', 422)
    }

    // Subtotal = suma de items (igual a existing.total); total con propina
    const subtotal = existing.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
    const grandTotal = subtotal + tip

    const order = await db.order.update({
      where: { id },
      data: {
        status: 'pagado',
        tip,
        total: grandTotal,
        paymentMethod,
        paidAt: new Date(),
      },
      include: { items: { include: { product: true } } },
    })

    // Notificar a la barra que la orden fue cerrada
    await emitWsEvent('order:status', order.id)

    const payload = {
      id: order.id,
      tableId: order.tableId,
      status: order.status,
      total: order.total,
      tip: order.tip,
      paymentMethod: order.paymentMethod,
      subtotal,
      paidAt: order.paidAt?.toISOString() ?? null,
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
