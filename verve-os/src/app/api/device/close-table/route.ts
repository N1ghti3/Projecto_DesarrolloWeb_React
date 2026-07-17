// POST /api/device/close-table
// Staff cierra la sesión kiosk de una mesa (al cobrar o liberar).
// Requiere PIN o JWT de staff.
import { db } from '@/lib/db'
import { verifyPin } from '@/lib/auth'
import { requireStaff, ok, fail, handleRouteError, emitWsBroadcast, checkRateLimit } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.tableNumber) {
      return fail('tableNumber es obligatorio', 422)
    }

    // Auth: PIN o JWT staff
    let userId: string | null = null
    if (body.pin) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      const rl = checkRateLimit(`pin:${ip}`, 5, 60000)
      if (!rl.allowed) {
        return fail('Demasiados intentos. Intenta de nuevo en un minuto.', 429)
      }
      const u = await verifyPin(String(body.pin))
      if (!u) return fail('PIN inválido', 401)
      userId = u.id
    } else {
      const auth = requireStaff(req)
      if ('error' in auth) return auth.error
      userId = auth.user.id
    }

    const tableNumber = String(body.tableNumber).trim().toUpperCase()
    const table = await db.table.findUnique({ where: { number: tableNumber } })
    if (!table) return fail('Mesa no encontrada', 404)

    // Cerrar sesiones activas
    await db.deviceSession.updateMany({
      where: { tableId: table.id, active: true },
      data: { active: false, closedAt: new Date(), userId: userId ?? undefined },
    })

    // Liberar mesa
    await db.table.update({
      where: { id: table.id },
      data: { status: 'libre' },
    })

    await emitWsBroadcast('table:update', {
      tableId: table.id,
      number: table.number,
      status: 'libre',
    })

    return ok({ table: { id: table.id, number: table.number, status: 'libre' } })
  } catch (err) {
    return handleRouteError(err)
  }
}
