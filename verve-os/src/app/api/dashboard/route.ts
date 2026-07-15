import { db } from '@/lib/db'
import { requireAuth, ok, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // Órdenes del día de hoy
    const todayOrders = await db.order.findMany({
      where: { createdAt: { gte: startOfDay } },
      include: { items: true },
    })

    const totalOrders = todayOrders.length
    const totalRevenue = todayOrders
      .filter((o) => o.status === 'pagado')
      .reduce((s, o) => s + (o.total ?? 0) + (o.tax ?? 0) + (o.tip ?? 0), 0)
    const totalTax = todayOrders
      .filter((o) => o.status === 'pagado')
      .reduce((s, o) => s + (o.tax ?? 0), 0)

    // Conteo por estado
    const ordersByStatus: Record<string, number> = {}
    for (const s of ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado', 'pagado']) {
      ordersByStatus[s] = todayOrders.filter((o) => o.status === s).length
    }

    // Ventas por método de pago
    const paidOrders = todayOrders.filter((o) => o.status === 'pagado' && o.paymentMethod)
    const salesByPayment: Record<string, number> = {}
    for (const o of paidOrders) {
      const method = o.paymentMethod ?? 'otro'
      salesByPayment[method] = (salesByPayment[method] ?? 0) + (o.total ?? 0) + (o.tax ?? 0) + (o.tip ?? 0)
    }

    // Productos más vendidos (de hoy)
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    for (const o of todayOrders) {
      for (const it of o.items) {
        if (it.status === 'cancelado') continue
        if (!productSales[it.productId]) {
          productSales[it.productId] = { name: 'Producto eliminado', quantity: 0, revenue: 0 }
        }
        productSales[it.productId].quantity += it.quantity
        productSales[it.productId].revenue += it.unitPrice * it.quantity
      }
    }

    // Resolver nombres de productos
    const productIds = Object.keys(productSales)
    if (productIds.length > 0) {
      const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      for (const p of products) {
        if (productSales[p.id]) productSales[p.id].name = p.name
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Mesas activas
    const activeTables = await db.table.count({ where: { status: { in: ['ocupada', 'cobrada'] } } })
    const freeTables = await db.table.count({ where: { status: 'libre' } })

    return ok({
      today: {
        orders: totalOrders,
        revenue: totalRevenue,
        tax: totalTax,
        paidOrders: paidOrders.length,
      },
      ordersByStatus,
      salesByPayment,
      topProducts,
      tables: { active: activeTables, free: freeTables, total: activeTables + freeTables },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
