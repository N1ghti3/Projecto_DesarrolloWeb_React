import { db } from '@/lib/db'
import { requireAdmin, ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return ok({ categories })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !body.name) return fail('name es obligatorio', 422)

    const name = String(body.name).trim()
    const existing = await db.category.findUnique({ where: { name } })
    if (existing) return fail('Ya existe una categoría con ese nombre', 409)

    const category = await db.category.create({
      data: {
        name,
        emoji: String(body.emoji ?? '🍽️').trim(),
        station: ['cocina', 'barra'].includes(body.station) ? body.station : 'cocina',
        sortOrder: Number(body.sortOrder ?? 0),
      },
    })

    return ok({ category }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
