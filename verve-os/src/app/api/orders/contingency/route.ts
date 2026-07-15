// POST /api/orders/contingency - Sincroniza pedidos creados offline
// Recibe un lote de órdenes guardadas en localStorage y las persiste.
import { db } from '@/lib/db'
import { requireAuth, ok, fail, handleRouteError, emitWsEvent } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

interface OfflineItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface OfflineOrder {
  localId: string
  tableId: string
  notes: string
  total: number
  items: OfflineItem[]
  createdAt: string
}

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !Array.isArray(body.orders)) {
      return fail('Se esperaba { orders: [...] }', 422)
    }

    const offlineOrders: OfflineOrder[] = body.orders
    const synced: string[] = []
    const errors: Array<{ localId: string; reason: string }> = []

    for (const off of offlineOrders) {
      if (!off.tableId || !Array.isArray(off.items) || off.items.length === 0) continue

      const productIds = off.items.map((i) => i.productId)
      const products = await db.product.findMany({ where: { id: { in: productIds } } })

      // Validar stock disponible para cada item
      let total = 0
      const orderItemsData: Array<{
        productId: string
        quantity: number
        unitPrice: number
        notes: string
      }> = []
      const stockUpdates: Array<{ id: string; qty: number }> = []
      let stockError: string | null = null

      for (const it of off.items) {
        const product = products.find((p) => p.id === it.productId)
        if (!product) continue
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
        if (product.stock < qty) {
          stockError = `Stock insuficiente para "${product.name}" (disponible ${product.stock})`
          break
        }
        total += product.price * qty
        orderItemsData.push({
          productId: it.productId,
          quantity: qty,
          unitPrice: product.price,
          notes: String(it.notes ?? '').trim(),
        })
        stockUpdates.push({ id: it.productId, qty })
      }

      if (stockError) {
        errors.push({ localId: off.localId, reason: stockError })
        continue
      }
      if (orderItemsData.length === 0) continue

      // Transacción: crear orden + descontar stock
      const order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            tableId: String(off.tableId),
            status: 'pendiente',
            total,
            notes: String(off.notes ?? '').trim(),
            userId: auth.user.id,
            source: 'contingencia',
            items: { create: orderItemsData },
          },
        })
        for (const su of stockUpdates) {
          const updated = await tx.product.update({
            where: { id: su.id },
            data: { stock: { decrement: su.qty } },
            select: { stock: true },
          })
          if (updated.stock <= 0) {
            await tx.product.update({
              where: { id: su.id },
              data: { stock: 0, available: false },
            })
          }
        }
        return created
      })

      await emitWsEvent('order:new', order.id)
      synced.push(off.localId)
    }

    return ok({ synced, count: synced.length, errors })
  } catch (err) {
    return handleRouteError(err)
  }
}
