// POST /api/device/open-table
// Staff abre una mesa para kiosk: verifica PIN, marca mesa como ocupada,
// crea una DeviceSession y devuelve el token + info de la mesa.
import { db } from '@/lib/db'
import { verifyPin, generateDeviceToken } from '@/lib/auth'
import { ok, fail, handleRouteError, emitWsBroadcast } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.pin || !body.tableNumber) {
      return fail('pin y tableNumber son obligatorios', 422)
    }

    const user = await verifyPin(String(body.pin))
    if (!user) {
      return fail('PIN inválido', 401)
    }

    const tableNumber = String(body.tableNumber).trim().toUpperCase()
    const table = await db.table.findUnique({ where: { number: tableNumber } })
    if (!table) {
      return fail('Mesa no encontrada', 404)
    }

    // Cerrar cualquier sesión activa previa en esta mesa
    await db.deviceSession.updateMany({
      where: { tableId: table.id, active: true },
      data: { active: false, closedAt: new Date() },
    })

    const token = generateDeviceToken()
    const session = await db.deviceSession.create({
      data: {
        token,
        tableId: table.id,
        userId: user.id,
        active: true,
      },
    })

    // Marcar mesa como ocupada
    await db.table.update({
      where: { id: table.id },
      data: { status: 'ocupada' },
    })

    // Notificar al staff que la mesa cambió de estado
    await emitWsBroadcast('table:update', {
      tableId: table.id,
      number: table.number,
      status: 'ocupada',
    })

    return ok({
      deviceToken: token,
      sessionId: session.id,
      table: {
        id: table.id,
        number: table.number,
        name: table.name,
        status: 'ocupada',
      },
      openedBy: { id: user.id, name: user.name, role: user.role },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
