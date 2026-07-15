// GET /api/settings - Configuración pública (IVA, nombre del local)
import { db } from '@/lib/db'
import { ok, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await db.setting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value
    return ok({
      taxRate: Number(map.tax_rate ?? 19),
      taxName: map.tax_name ?? 'IVA',
      venueName: map.venue_name ?? 'VerveOS',
    })
  } catch (err) {
    return handleRouteError(err)
  }
}
