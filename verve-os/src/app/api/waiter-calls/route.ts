// GET  /api/waiter-calls - Lista de llamados pendientes (meseros)
// POST /api/waiter-calls - Crea un llamado desde el kiosk (device token o staff)
import { db } from '@/lib/db'
import { requireAnyAuth, requireStaff, ok, fail, handleRouteError, emitWsBroadcast } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = requireStaff(req)
    if ('error' in auth) return auth.error

    const calls = await db.waiterCall.findMany({
      where: { status: 'pendiente' },
      orderBy: { createdAt: 'asc' },
    })

    // Resolver números de mesa
    const tableIds = [...new Set(calls.map((c) => c.tableId))]
    const tables = await db.table.findMany({ where: { id: { in: tableIds } } })
    const tableMap = new Map(tables.map((t) => [t.id, t.number]))

    const payload = calls.map((c) => ({
      id: c.id,
      tableId: c.tableId,
      tableNumber: tableMap.get(c.tableId) ?? null,
      reason: c.reason,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      attendedAt: c.attendedAt?.toISOString() ?? null,
    }))

    return ok({ calls: payload })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAnyAuth(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    // tableId es el cuid de la mesa
    let tableId = body.tableId
    // Si viene tableNumber, resolver
    if (!tableId && body.tableNumber) {
      const t = await db.table.findUnique({ where: { number: String(body.tableNumber).toUpperCase() } })
      if (!t) return fail('Mesa no encontrada', 404)
      tableId = t.id
    }
    if (!tableId) return fail('tableId o tableNumber requerido', 422)

    const reason = ['mesero', 'cuenta', 'ayuda'].includes(body.reason) ? body.reason : 'mesero'

    const call = await db.waiterCall.create({
      data: {
        tableId: String(tableId),
        reason,
        status: 'pendiente',
        userId: auth.user?.id ?? null,
      },
    })

    // Resolver el número de mesa para el payload
    const table = await db.table.findUnique({ where: { id: String(tableId) } })

    const payload = {
      id: call.id,
      tableId: call.tableId,
      tableNumber: table?.number ?? null,
      reason: call.reason,
      status: call.status,
      createdAt: call.createdAt.toISOString(),
    }

    // Notificar a meseros en tiempo real
    await emitWsBroadcast('waiter:call', payload, ['meseros', 'staff'])

    return ok({ call: payload }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
