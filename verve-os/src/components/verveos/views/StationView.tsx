// StationView - Pantalla de estación (cocina o barra) en tiempo real.
// Muestra órdenes activas con estado a NIVEL DE ÍTEM (no de orden).
// Cada estación solo ve los items cuyo `station` coincide con el suyo.
'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChefHat,
  Wine,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import type { User, View, Order, OrderItem, ItemStatus } from '@/lib/types'
import { formatPrice } from '../MenuItem'
import { AppHeader } from '../AppHeader'

interface StationViewProps {
  user: User
  station: 'cocina' | 'barra'
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

// Paleta gastro-bar: ámbar (pendiente), cobre (en preparación),
// oliva (listo), vino (cancelado)
const ITEM_STATUS_META: Record<
  ItemStatus,
  { label: string; color: string }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
  },
  en_preparacion: {
    label: 'En preparación',
    color: 'bg-orange-700/20 text-orange-400 border-orange-700/40',
  },
  listo: {
    label: 'Listo',
    color: 'bg-lime-700/20 text-lime-400 border-lime-700/40',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-rose-900/25 text-rose-400 border-rose-800/40',
  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60}min`
}

export function StationView({ user, station, online, navigate, onLogout }: StationViewProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const soundEnabledRef = useRef(soundEnabled)
  const { play } = useNotificationSound()

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  useEffect(() => {
    setLoading(true)

    // Conexión WebSocket (regla del gateway: XTransformPort=3003, path "/")
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'] as any,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 10000,
    } as any)
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join', station)
      socket.emit('request:active-orders', { station })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    socket.on('active-orders', (list: Order[]) => {
      setOrders(list)
      setLoading(false)
    })

    socket.on('order:new', (order: Order) => {
      // Solo nos interesa si la orden tiene al menos un ítem para esta estación
      const hasForStation = order.items.some((it) => it.station === station)
      if (!hasForStation) return
      setOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev
        return [...prev, order].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      })
      toast.info(`Nuevo pedido · Mesa ${order.tableNumber ?? order.tableId}`, {
        description: `${order.items.filter((i) => i.station === station).length} artículo(s) para ${station}`,
      })
      if (soundEnabledRef.current) play()
    })

    socket.on('order:status', (order: Order) => {
      setOrders((prev) => {
        const hasForStation = order.items.some((it) => it.station === station)
        // Si la orden entró a estado terminal, removerla tras 3s
        if (['pagado', 'cancelado', 'entregado'].includes(order.status)) {
          const updated = prev.map((o) => (o.id === order.id ? order : o))
          setTimeout(() => {
            setOrders((cur) => cur.filter((o) => o.id !== order.id))
          }, 3000)
          return updated
        }
        // Si la orden no tiene items para esta estación, no mostrarla
        if (!hasForStation) {
          return prev.filter((o) => o.id !== order.id)
        }
        return prev.some((o) => o.id === order.id)
          ? prev.map((o) => (o.id === order.id ? order : o))
          : [...prev, order]
      })
    })

    socket.on('item:status', (payload: { orderId: string; itemId: string; status: ItemStatus }) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== payload.orderId) return o
          return {
            ...o,
            items: o.items.map((it) =>
              it.id === payload.itemId ? { ...it, status: payload.status } : it
            ),
          }
        })
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [station])

  const changeItemStatus = async (order: Order, item: OrderItem, status: ItemStatus) => {
    setUpdatingItemId(item.id)
    try {
      await api.updateItemStatus(order.id, item.id, status)
      // Actualización optimista: el WS confirmará con 'item:status'
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                items: o.items.map((it) =>
                  it.id === item.id ? { ...it, status } : it
                ),
              }
            : o
        )
      )
      toast.success(`${item.productName} · ${ITEM_STATUS_META[status].label}`)
    } catch (err) {
      toast.error('No se pudo actualizar el ítem', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setUpdatingItemId(null)
    }
  }

  // Órdenes activas: pendiente, en_preparacion o listo
  // y que tengan al menos un ítem para esta estación
  const active = orders
    .filter((o) => ['pendiente', 'en_preparacion', 'listo'].includes(o.status))
    .filter((o) => o.items.some((it) => it.station === station))

  const activeCount = active.length
  const StationIcon = station === 'cocina' ? ChefHat : Wine
  const stationEmoji = station === 'cocina' ? '🍳' : '🍸'
  const stationLabel = station === 'cocina' ? 'Cocina' : 'Barra'

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title={stationLabel}
        subtitle={`${activeCount} orden(es) activa(s)`}
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      {/* Indicador de conexión en tiempo real */}
      <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center gap-2 text-xs">
        <span className={`relative flex h-2 w-2 ${connected ? 'text-lime-400' : 'text-muted-foreground'}`}>
          {connected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-lime-400' : 'bg-muted-foreground'}`} />
        </span>
        <span className={connected ? 'text-lime-400' : 'text-muted-foreground'}>
          {connected ? 'Conectado en tiempo real' : 'Reconectando...'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 gap-1.5 text-xs"
          onClick={() => setSoundEnabled((s) => !s)}
          aria-label={soundEnabled ? 'Silenciar notificaciones' : 'Activar sonido'}
          title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-primary" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? 'Sonido' : 'Silencio'}</span>
        </Button>
        <Radio className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-5xl mb-3 opacity-60">{stationEmoji}</div>
            <p className="text-lg font-medium">No hay órdenes para {station}</p>
            <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {active.map((order) => {
              const stationItems = order.items.filter((it) => it.station === station)
              return (
                <Card key={order.id} className="p-4 flex flex-col gap-3">
                  {/* Cabecera: mesa + tiempo + estado de orden */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold">
                          Mesa {order.tableNumber ?? order.tableId}
                        </span>
                        {order.source === 'contingencia' && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                            offline
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                          <StationIcon className="w-2.5 h-2.5" />
                          {stationLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Nota general de la orden */}
                  {order.notes && (
                    <p className="text-xs text-amber-400/90 bg-amber-500/5 rounded-md p-2 border border-amber-500/20">
                      Nota: {order.notes}
                    </p>
                  )}

                  {/* Lista de items de esta estación */}
                  <ScrollArea className="max-h-72 scrollbar-verve rounded-md">
                    <ul className="space-y-2 pr-2">
                      {stationItems.map((it) => {
                        const meta = ITEM_STATUS_META[it.status]
                        const isUpdating = updatingItemId === it.id
                        return (
                          <li
                            key={it.id}
                            className={`rounded-md border border-border/60 bg-muted/20 p-2.5 ${
                              it.status === 'cancelado' ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-semibold tabular-nums">{it.quantity}×</span>
                                  <span
                                    className={`text-sm font-medium ${
                                      it.status === 'cancelado' ? 'line-through text-muted-foreground' : ''
                                    }`}
                                  >
                                    {it.productName}
                                  </span>
                                </div>
                                {it.notes && (
                                  <p className="text-xs text-amber-400/80 pl-5 mt-0.5">↳ {it.notes}</p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                                {formatPrice(it.unitPrice * it.quantity)}
                              </span>
                            </div>

                            {/* Acciones / estado del ítem */}
                            <div className="mt-2 flex items-center justify-end gap-1.5">
                              {it.status === 'pendiente' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 gap-1 text-xs bg-orange-700/20 text-orange-400 hover:bg-orange-700/30 border-orange-700/30"
                                  disabled={isUpdating}
                                  onClick={() => changeItemStatus(order, it, 'en_preparacion')}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ChefHat className="w-3 h-3" />
                                  )}
                                  Iniciar
                                </Button>
                              )}
                              {it.status === 'en_preparacion' && (
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 text-xs bg-lime-700/20 text-lime-400 hover:bg-lime-700/30 border-lime-700/30"
                                  disabled={isUpdating}
                                  onClick={() => changeItemStatus(order, it, 'listo')}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  Listo
                                </Button>
                              )}
                              {it.status === 'listo' && (
                                <Badge variant="outline" className={`gap-1 ${meta.color}`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Listo
                                </Badge>
                              )}
                              {it.status === 'cancelado' && (
                                <Badge variant="outline" className={`gap-1 ${meta.color}`}>
                                  <XCircle className="w-3 h-3" />
                                  Cancelado
                                </Badge>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>

                  {/* Resumen de items de esta estación */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      {stationItems.filter((i) => i.status === 'pendiente').length} pend ·{' '}
                      {stationItems.filter((i) => i.status === 'en_preparacion').length} prep ·{' '}
                      {stationItems.filter((i) => i.status === 'listo').length} listos
                    </span>
                    <span className="tabular-nums">
                      {stationItems.length} ítem(s)
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-3 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {stationEmoji} Estación de {station} · Tiempo real
        </span>
      </footer>
    </div>
  )
}
