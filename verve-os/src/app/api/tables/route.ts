// GET /api/tables - Lista de mesas con su estado (staff + visor)
import { db } from '@/lib/db'
import { requireAuth, ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const tables = await db.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { status: { in: ['pendiente', 'en_preparacion', 'listo'] } },
          select: { id: true, total: true, status: true, createdAt: true },
        },
      },
    })

    const payload = tables.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      status: t.status,
      capacity: t.capacity,
      activeOrders: t.orders.length,
      openTotal: t.orders.reduce((s, o) => s + o.total, 0),
    }))

    return ok({ tables: payload })
  } catch (err) {
    return handleRouteError(err)
  }
}
