// POST /api/orders - Crea un nuevo pedido desde una mesa (kiosk o staff)
// Acepta JWT de staff O device token de kiosk. Descuenta stock, calcula IVA,
// asigna estación (cocina/barra) por producto, emite a estaciones + mesa.
import { db } from '@/lib/db'
import { requireAnyAuth, ok, fail, handleRouteError, emitWsEvent, getTaxRate } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

interface CreateItemInput {
  productId: string
  quantity: number
  notes?: string
}

export async function POST(req: Request) {
  try {
    const auth = await requireAnyAuth(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => null)
    if (!body || !body.tableId || !Array.isArray(body.items) || body.items.length === 0) {
      return fail('tableId e items son obligatorios', 422)
    }

    // tableId puede ser el número de mesa (M5) o el cuid
    const table = await (async () => {
      const t = String(body.tableId).trim()
      return (
        (await db.table.findUnique({ where: { number: t.toUpperCase() } })) ||
        (await db.table.findUnique({ where: { id: t } }))
      )
    })()
    if (!table) return fail('Mesa no encontrada', 404)

    const notes = String(body.notes ?? '').trim()
    const customerName = body.customerName ? String(body.customerName).trim() : null
    const customerEmail = body.customerEmail ? String(body.customerEmail).trim() : null
    const items: CreateItemInput[] = body.items

    // Validar productos, stock y estación
    const productIds = items.map((i) => i.productId)
    const products = await db.product.findMany({ where: { id: { in: productIds } } })
    if (products.length !== productIds.length) {
      return fail('Uno o más productos no existen', 404)
    }

    let subtotal = 0
    const orderItemsData: Array<{
      productId: string
      quantity: number
      unitPrice: number
      notes: string
      status: string
      station: string
    }> = []
    const stockUpdates: Array<{ id: string; qty: number; name: string }> = []

    for (const it of items) {
      const product = products.find((p) => p.id === it.productId)!
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
      if (!product.available) {
        return fail(`"${product.name}" no está disponible`, 422)
      }
      if (product.stock < qty) {
        return fail(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`, 422)
      }
      subtotal += product.price * qty
      orderItemsData.push({
        productId: it.productId,
        quantity: qty,
        unitPrice: product.price,
        notes: String(it.notes ?? '').trim(),
        status: 'pendiente',
        station: product.station, // cocina o barra
      })
      stockUpdates.push({ id: it.productId, qty, name: product.name })
    }

    const taxRate = await getTaxRate()
    const tax = Math.round((subtotal * taxRate) / 100)

    // Transacción: crear orden + descontar stock
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableId: table.id,
          status: 'pendiente',
          total: subtotal,
          tax,
          notes,
          userId: auth.user?.id ?? null,
          source: 'online',
          customerName,
          customerEmail,
          items: { create: orderItemsData },
        },
        include: { items: { include: { product: true } } },
      })
      for (const su of stockUpdates) {
        const updated = await tx.product.update({
          where: { id: su.id },
          data: { stock: { decrement: su.qty } },
          select: { stock: true },
        })
        if (updated.stock <= 0) {
          await tx.product.update({ where: { id: su.id }, data: { stock: 0, available: false } })
        }
      }
      return created
    })

    await emitWsEvent('order:new', order.id)

    const payload = {
      id: order.id,
      tableId: order.tableId,
      tableNumber: table.number,
      status: order.status,
      total: order.total,
      tax: order.tax,
      tip: order.tip,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt?.toISOString() ?? null,
      notes: order.notes,
      source: order.source,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name ?? 'Producto eliminado',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
        status: it.status,
        station: it.station,
      })),
    }

    return ok({ order: payload }, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
