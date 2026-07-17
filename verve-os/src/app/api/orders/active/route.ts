// GET /api/orders/active - Lista de órdenes activas (opcional filtrar por estación)
import { db } from '@/lib/db'
import { requireAuth, ok, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const url = new URL(req.url)
    const station = url.searchParams.get('station') // 'cocina' | 'barra' | null

    const orders = await db.order.findMany({
      where: { status: { in: ['pendiente', 'en_preparacion', 'listo'] } },
      include: { items: { include: { product: true } }, table: true },
      orderBy: { createdAt: 'asc' },
    })

    let payload = orders.map((o) => ({
      id: o.id,
      tableId: o.tableId,
      tableNumber: o.table?.number ?? o.tableId,
      status: o.status,
      total: o.total,
      tax: o.tax,
      tip: o.tip,
      paymentMethod: o.paymentMethod,
      paidAt: o.paidAt?.toISOString() ?? null,
      notes: o.notes,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name ?? 'Producto eliminado',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
        status: it.status,
        station: it.station,
      })),
    }))

    // Filtrar items por estación (para display de cocina o barra)
    if (station === 'cocina' || station === 'barra') {
      payload = payload
        .map((o) => ({ ...o, items: o.items.filter((it) => it.station === station) }))
        .filter((o) => o.items.length > 0)
    }

    return ok({ orders: payload })
  } catch (err) {
    return handleRouteError(err)
  }
}
