// VerveOS - Mini-service WebSocket (socket.io)
// Puerto 3003 - Tiempo real para barra, cocina, meseros y mesas (kiosk).
//
// Salas:
//   - bar       : display de la barra (bebidas/cocteles)
//   - cocina    : display de cocina (comida)
//   - meseros   : notificaciones para meseros (llamados, pedidos listos)
//   - table:<n> : mesa específica (kiosk recibe estado de sus órdenes)
//   - staff     : todo el staff (admin, cajero)
//
// Eventos emitidos a clientes:
//   - order:new, order:status (a bar+cocina según estación + table:<n>)
//   - item:status (a bar+cocina + table:<n>)
//   - waiter:call, waiter:attend (a meseros)
//   - menu:update (broadcast a todos)
//   - table:update (broadcast)
//   - bill:updated (a table:<n> + cajero)
import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const emitterApp = express()
emitterApp.use(express.json({ limit: '5mb' }))

emitterApp.get('/__health', (_req, res) => res.json({ ok: true, service: 'verveos-ws' }))

const httpServer = createServer(emitterApp)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Tipos ---
interface OrderItemPayload {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  notes: string
  status: string
  station: string
}
interface OrderPayload {
  id: string
  tableId: string
  status: string
  total: number
  tax: number
  tip: number
  paymentMethod: string | null
  paidAt: string | null
  notes: string
  source: string
  createdAt: string
  items: OrderItemPayload[]
}

async function buildOrderPayload(orderId: string): Promise<OrderPayload | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  })
  if (!order) return null
  return {
    id: order.id,
    tableId: order.tableId,
    status: order.status,
    total: order.total,
    tax: order.tax,
    tip: order.tip,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt?.toISOString() ?? null,
    notes: order.notes,
    source: order.source,
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
}

// --- Rutas internas ---
// POST /__emit { event, orderId } - emite eventos de orden a bar/cocina/table
emitterApp.post('/__emit', async (req, res) => {
  try {
    const { event, orderId } = req.body || {}
    if (!event || !orderId) return res.status(400).json({ error: 'event y orderId requeridos' })
    const payload = await buildOrderPayload(orderId)
    if (!payload) return res.status(404).json({ error: 'orden no encontrada' })

    // Resolver el número de mesa para el room (el cliente se une a table:M1)
    const table = await db.table.findUnique({ where: { id: payload.tableId } })
    const tableRoom = `table:${table?.number ?? payload.tableId}`
    if (event === 'order:new') {
      io.to('bar').emit('order:new', payload)
      io.to('cocina').emit('order:new', payload)
      io.to(tableRoom).emit('order:new', payload)
    } else if (event === 'order:status') {
      io.to('bar').emit('order:status', payload)
      io.to('cocina').emit('order:status', payload)
      io.to(tableRoom).emit('order:status', payload)
      // Si la orden está lista, notificar a meseros
      if (payload.status === 'listo') {
        io.to('meseros').emit('order:ready', payload)
      }
    } else if (event === 'item:status') {
      io.to('bar').emit('item:status', payload)
      io.to('cocina').emit('item:status', payload)
      io.to(tableRoom).emit('item:status', payload)
    } else {
      return res.status(400).json({ error: 'evento desconocido: ' + event })
    }
    return res.json({ ok: true, emitted: event })
  } catch (err) {
    console.error('[VerveOS WS] Error /__emit:', err)
    return res.status(500).json({ error: 'error interno' })
  }
})

// POST /__broadcast { event, payload } - emite a salas específicas o a todos
emitterApp.post('/__broadcast', async (req, res) => {
  try {
    const { event, payload, rooms } = req.body || {}
    if (!event) return res.status(400).json({ error: 'event requerido' })
    if (rooms && Array.isArray(rooms)) {
      for (const r of rooms) io.to(r).emit(event, payload)
    } else {
      io.emit(event, payload)
    }
    return res.json({ ok: true, emitted: event })
  } catch (err) {
    console.error('[VerveOS WS] Error /__broadcast:', err)
    return res.status(500).json({ error: 'error interno' })
  }
})

// --- Eventos de socket.io ---
io.on('connection', (socket) => {
  console.log(`[VerveOS WS] Cliente conectado: ${socket.id}`)

  // Unirse a salas
  socket.on('join', (room: string) => {
    if (typeof room !== 'string') return
    socket.join(room)
    console.log(`[VerveOS WS] ${socket.id} → sala '${room}'`)
  })

  // Solicitar órdenes activas por estación
  socket.on('request:active-orders', async (data?: { station?: 'bar' | 'cocina' }) => {
    try {
      const where: Record<string, unknown> = {
        status: { in: ['pendiente', 'en_preparacion', 'listo'] },
      }
      const orders = await db.order.findMany({
        where: where as any,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      })
      let payload = orders.map((o) => ({
        id: o.id,
        tableId: o.tableId,
        status: o.status,
        total: o.total,
        tax: o.tax,
        tip: o.tip,
        paymentMethod: o.paymentMethod,
        paidAt: o.paidAt?.toISOString() ?? null,
        notes: o.notes,
        source: o.source,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.product?.name ?? 'Producto eliminado',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
          status: it.status,
          station: it.station,
        })),
      }))
      // Filtrar por estación: solo items de esa estación
      if (data?.station) {
        payload = payload
          .map((o) => ({ ...o, items: o.items.filter((it) => it.station === data.station) }))
          .filter((o) => o.items.length > 0)
      }
      socket.emit('active-orders', payload)
    } catch (err) {
      console.error('[VerveOS WS] Error active-orders:', err)
    }
  })

  // Solicitar llamados de mesero pendientes
  socket.on('request:waiter-calls', async () => {
    try {
      const calls = await db.waiterCall.findMany({
        where: { status: 'pendiente' },
        orderBy: { createdAt: 'asc' },
      })
      socket.emit('waiter-calls', calls)
    } catch (err) {
      console.error('[VerveOS WS] Error waiter-calls:', err)
    }
  })

  // Solicitar estado de las órdenes de una mesa (para kiosk)
  socket.on('request:table-orders', async (tableId: string) => {
    try {
      // Resolver el tableId: puede ser un número (M1) o un cuid
      let resolvedTableId = tableId
      const table = await db.table.findUnique({ where: { number: tableId.toUpperCase() } })
      if (table) resolvedTableId = table.id

      const orders = await db.order.findMany({
        where: { tableId: resolvedTableId, status: { in: ['pendiente', 'en_preparacion', 'listo'] } },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      })
      const payload = orders.map((o) => ({
        id: o.id,
        tableId: o.tableId,
        status: o.status,
        total: o.total,
        tax: o.tax,
        tip: o.tip,
        paymentMethod: o.paymentMethod,
        paidAt: o.paidAt?.toISOString() ?? null,
        notes: o.notes,
        source: o.source,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.product?.name ?? 'Producto eliminado',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes,
          status: it.status,
          station: it.station,
        })),
      }))
      socket.emit('table-orders', payload)
    } catch (err) {
      console.error('[VerveOS WS] Error table-orders:', err)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[VerveOS WS] Cliente desconectado: ${socket.id}`)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[VerveOS WS] Servicio WebSocket escuchando en puerto ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[VerveOS WS] SIGTERM, cerrando...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[VerveOS WS] SIGINT, cerrando...')
  httpServer.close(() => process.exit(0))
})
