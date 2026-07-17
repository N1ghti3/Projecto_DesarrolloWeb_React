// POST /api/orders/:id/cancel - Cancela una orden entera y restaura el stock
import { db } from '@/lib/db'
import { requireStaff, ok, fail, handleRouteError, emitWsEvent } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireStaff(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) return fail('Orden no encontrada', 404)
    if (order.status === 'cancelado') return fail('La orden ya está cancelada', 422)
    if (order.status === 'pagado') return fail('No se puede cancelar una orden pagada', 422)

    await db.$transaction(async (tx) => {
      // Restaurar stock de items no cancelados
      for (const it of order.items) {
        if (it.status !== 'cancelado') {
          const product = await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
            select: { stock: true },
          })
          if (product.stock > 0) {
            await tx.product.update({ where: { id: it.productId }, data: { available: true } })
          }
          await tx.orderItem.update({ where: { id: it.id }, data: { status: 'cancelado' } })
        }
      }
      await tx.order.update({ where: { id }, data: { status: 'cancelado' } })
    })

    await emitWsEvent('order:status', id)

    return ok({ id, status: 'cancelado' })
  } catch (err) {
    return handleRouteError(err)
  }
}
