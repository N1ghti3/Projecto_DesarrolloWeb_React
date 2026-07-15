// POST /api/waiter-calls/:id/attend - Marca un llamado como atendido
import { db } from '@/lib/db'
import { requireStaff, ok, fail, handleRouteError, emitWsBroadcast } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireStaff(req)
    if ('error' in auth) return auth.error

    const { id } = await ctx.params
    const call = await db.waiterCall.findUnique({ where: { id } })
    if (!call) return fail('Llamado no encontrado', 404)

    const updated = await db.waiterCall.update({
      where: { id },
      data: { status: 'atendido', attendedAt: new Date(), userId: auth.user.id },
    })

    const table = await db.table.findUnique({ where: { id: updated.tableId } })

    await emitWsBroadcast(
      'waiter:attend',
      { id: updated.id, tableId: updated.tableId, tableNumber: table?.number ?? null },
      ['meseros', 'staff']
    )

    return ok({
      call: {
        id: updated.id,
        tableNumber: table?.number ?? null,
        status: updated.status,
        attendedAt: updated.attendedAt?.toISOString(),
      },
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
