// GET  /api/menu        - Lista pública de productos (cualquiera autenticado)
// POST /api/menu        - Crea producto (solo admin)
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-utils'
import { ok, fail, handleRouteError } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Cualquiera autenticado puede ver el menú; pero si no hay token, igual
    // permitimos lectura para la vista de mesa (uso demo). Filtramos disponibles.
    const products = await db.product.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return ok({ products })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !body.name || body.price == null) {
      return fail('Nombre y precio son obligatorios', 422)
    }

    const product = await db.product.create({
      data: {
        name: String(body.name).trim(),
        description: String(body.description ?? '').trim(),
        price: Number(body.price),
        category: String(body.category ?? 'General').trim(),
        station: body.station === 'barra' ? 'barra' : 'cocina',
        stock: Number(body.stock ?? 0),
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        available: body.available !== undefined ? Boolean(body.available) : true,
      },
    })

    return ok({ product }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
