// GET  /api/tables/:id/bill - Cuenta abierta de la mesa (todas las órdenes no pagadas)
// POST /api/tables/:id/bill - Cobra toda la cuenta de la mesa (propina + método)
import { db } from '@/lib/db'
import { requireAuth, requireStaff, ok, fail, handleRouteError, emitWsEvent, emitWsBroadcast, getTaxRate } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

const VALID_PAYMENTS = ['efectivo', 'tarjeta', 'transferencia']

// id aquí es el número de mesa (M5) o el cuid
async function resolveTable(id: string) {
  return (
    (await db.table.findUnique({ where: { number: id.toUpperCase() } })) ||
    (await db.table.findUnique({ where: { id } }))
  )
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const table = await resolveTable(id)
    if (!table) return fail('Mesa no encontrada', 404)

    const orders = await db.order.findMany({
      where: { tableId: table.id, status: { in: ['pendiente', 'en_preparacion', 'listo', 'entregado'] } },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const taxRate = await getTaxRate()
    let subtotal = 0
    const allItems: Array<{
      orderId: string
      orderItemId: string
      productName: string
      quantity: number
      unitPrice: number
      lineTotal: number
      notes: string
      status: string
      createdAt: string
    }> = []
    for (const o of orders) {
      for (const it of o.items) {
        if (it.status === 'cancelado') continue
        subtotal += it.unitPrice * it.quantity
        allItems.push({
          orderId: o.id,
          orderItemId: it.id,
          productName: it.product?.name ?? 'Producto eliminado',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.unitPrice * it.quantity,
          notes: it.notes,
          status: it.status,
          createdAt: o.createdAt.toISOString(),
        })
      }
    }
    const tax = Math.round((subtotal * taxRate) / 100)

    const billData = {
      table: { id: table.id, number: table.number, name: table.name, status: table.status },
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        tax: o.tax,
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.filter((i) => i.status !== 'cancelado').length,
      })),
      items: allItems,
      subtotal,
      taxRate,
      tax,
      total: subtotal, // base
      grandTotal: subtotal + tax, // con IVA (sin propina)
    }
    // El cliente espera { bill: {...} }
    return ok({ bill: billData })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireStaff(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const table = await resolveTable(id)
    if (!table) return fail('Mesa no encontrada', 404)

    const tip = Math.max(0, Number(body.tip ?? 0))
    const paymentMethod = body.paymentMethod && VALID_PAYMENTS.includes(body.paymentMethod)
      ? body.paymentMethod
      : null

    const taxRate = await getTaxRate()

    // Todas las órdenes abiertas de la mesa
    const orders = await db.order.findMany({
      where: { tableId: table.id, status: { in: ['pendiente', 'en_preparacion', 'listo', 'entregado'] } },
      include: { items: true },
    })

    if (orders.length === 0) {
      return fail('No hay cuenta abierta para esta mesa', 422)
    }

    // Calcular subtotal total de la mesa
    let subtotal = 0
    for (const o of orders) {
      for (const it of o.items) {
        if (it.status !== 'cancelado') subtotal += it.unitPrice * it.quantity
      }
    }
    const tax = Math.round((subtotal * taxRate) / 100)
    const grandTotal = subtotal + tax + tip

    // Marcar todas las órdenes como pagadas en una transacción
    const updated = await db.$transaction(async (tx) => {
      const result: Array<{
        id: string; tableId: string; status: string; total: number; tax: number;
        tip: number; paymentMethod: string | null; notes: string; source: string;
        paidAt: Date | null; createdAt: Date; updatedAt: Date; userId: string | null;
      }> = []
      for (const o of orders) {
        const updated = await tx.order.update({
          where: { id: o.id },
          data: {
            status: 'pagado',
            tip: tip / orders.length,
            tax,
            total: o.items.filter((i) => i.status !== 'cancelado').reduce((s, it) => s + it.unitPrice * it.quantity, 0),
            paymentMethod,
            paidAt: new Date(),
          },
        })
        result.push(updated)
        await emitWsEvent('order:status', updated.id)
      }
      // Liberar mesa
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'cobrada' },
      })
      // Cerrar sesiones de dispositivo
      await tx.deviceSession.updateMany({
        where: { tableId: table.id, active: true },
        data: { active: false, closedAt: new Date() },
      })
      return result
    })

    await emitWsBroadcast('table:update', {
      tableId: table.id,
      number: table.number,
      status: 'cobrada',
    })

    return ok({
      table: { id: table.id, number: table.number, status: 'cobrada' },
      payment: {
        subtotal,
        taxRate,
        tax,
        tip,
        grandTotal,
        paymentMethod,
        ordersPaid: updated.length,
        paidAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
