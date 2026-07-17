// WaiterView - Llamados de mesa y pedidos listos en tiempo real (meseros)
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWebSocket } from '@/hooks/use-websocket'
import { wsService } from '@/lib/websocket'
import {
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Radio,
  Wine,
  Receipt,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import type { Order, User, View, WaiterCall } from '@/lib/types'
import { AppHeader } from '../AppHeader'

interface WaiterViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

// Razones de llamado: mesero=ámbar, cuenta=dorado (primary), ayuda=destructive
const REASON_META: Record<
  WaiterCall['reason'],
  { label: string; color: string; icon: typeof Bell }
> = {
  mesero: { label: 'Mesero', color: 'bg-amber-600/15 text-amber-500 border-amber-600/30', icon: Bell },
  cuenta: { label: 'Cuenta', color: 'bg-yellow-600/15 text-primary border-primary/30', icon: Receipt },
  ayuda: { label: 'Ayuda', color: 'bg-rose-900/25 text-destructive border-destructive/40', icon: X },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60}min`
}

export function WaiterView({ user, online, navigate, onLogout }: WaiterViewProps) {
  const [calls, setCalls] = useState<WaiterCall[]>([])
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [attendingId, setAttendingId] = useState<string | null>(null)
  const [deliveringId, setDeliveringId] = useState<string | null>(null)
  const soundEnabledRef = useRef(soundEnabled)
  const { play } = useNotificationSound()

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Carga inicial de pedidos listos (los llamados llegan por WS vía request:waiter-calls)
  const loadReadyOrders = useCallback(async () => {
    try {
      const res = await api.listActiveOrders()
      setReadyOrders(res.orders.filter((o) => o.status === 'listo'))
    } catch (err) {
      toast.error('No se pudieron cargar los pedidos', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReadyOrders()
  }, [loadReadyOrders])

  const { connected } = useWebSocket({
    events: {
      'waiter-calls': (list: unknown) => setCalls(Array.isArray(list) ? (list as WaiterCall[]) : []),
      'waiter:call': (call: unknown) => {
        const c = call as WaiterCall
        setCalls((prev) => {
          if (prev.find((p) => p.id === c.id)) return prev
          return [...prev, c].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        })
        const meta = REASON_META[c.reason] ?? REASON_META.mesero
        toast.info(`Mesa ${c.tableNumber ?? c.tableId} pide ${meta.label.toLowerCase()}`)
        if (soundEnabledRef.current) play()
      },
      'waiter:attend': (payload: unknown) => {
        const p = payload as { id: string }
        setCalls((prev) => prev.filter((c) => c.id !== p.id))
      },
      'order:status': (order: unknown) => {
        const o = order as Order
        if (o.status === 'listo') {
          setReadyOrders((prev) => (prev.find((p) => p.id === o.id) ? prev : [...prev, o]))
        } else if (o.status === 'entregado' || o.status === 'cancelado') {
          setReadyOrders((prev) => prev.filter((p) => p.id !== o.id))
        }
      },
      'order:ready': (order: unknown) => {
        const o = order as Order
        setReadyOrders((prev) => (prev.find((p) => p.id === o.id) ? prev : [...prev, o]))
        toast.info(`Pedido listo · Mesa ${o.tableId}`, {
          description: `${o.items.reduce((s, i) => s + i.quantity, 0)} artículo(s) para entregar`,
        })
      },
    },
    onConnect: () => {
      wsService.join('meseros')
      wsService.emit('request:waiter-calls')
    },
  })

  const attendCall = async (call: WaiterCall) => {
    setAttendingId(call.id)
    try {
      await api.attendCall(call.id)
      setCalls((prev) => prev.filter((c) => c.id !== call.id))
      toast.success(`Llamado de Mesa ${call.tableNumber ?? call.tableId} atendido`)
    } catch (err) {
      toast.error('No se pudo atender el llamado', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setAttendingId(null)
    }
  }

  const deliverOrder = async (order: Order) => {
    setDeliveringId(order.id)
    try {
      await api.updateOrderStatus(order.id, 'entregado')
      setReadyOrders((prev) => prev.filter((o) => o.id !== order.id))
      toast.success(`Mesa ${order.tableId}: pedido entregado`)
    } catch (err) {
      toast.error('No se pudo marcar como entregado', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeliveringId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Meseros"
        subtitle="Llamados y pedidos listos"
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      {/* Barra de conexión en tiempo real + toggle de sonido */}
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
            <Bell className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Columna 1: Llamados de mesa */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Llamados de mesa
                </h2>
                {calls.length > 0 && (
                  <Badge variant="outline" className="border-amber-600/30 text-amber-400">
                    {calls.length} pendiente(s)
                  </Badge>
                )}
              </div>

              {calls.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground border-dashed">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sin llamados pendientes</p>
                  <p className="text-xs mt-1">Los nuevos llamados aparecerán aquí al instante.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {calls.map((call) => {
                    const meta = REASON_META[call.reason] ?? REASON_META.mesero
                    const ReasonIcon = meta.icon
                    return (
                      <Card
                        key={call.id}
                        className="p-4 flex items-center gap-3 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                          <Bell className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">Mesa {call.tableNumber ?? call.tableId}</span>
                            <Badge variant="outline" className={`gap-1 ${meta.color}`}>
                              <ReasonIcon className="w-3 h-3" />
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {timeAgo(call.createdAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 gap-1.5"
                          disabled={attendingId === call.id}
                          onClick={() => attendCall(call)}
                        >
                          {attendingId === call.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Atender
                        </Button>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Columna 2: Pedidos listos para entregar */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-lime-400" />
                  Pedidos listos para entregar
                </h2>
                {readyOrders.length > 0 && (
                  <Badge variant="outline" className="border-lime-700/40 text-lime-400">
                    {readyOrders.length} listo(s)
                  </Badge>
                )}
              </div>

              {readyOrders.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground border-dashed">
                  <Wine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Sin pedidos listos</p>
                  <p className="text-xs mt-1">Los pedidos listos de cocina/barra aparecerán aquí.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="p-4 flex flex-col gap-3 transition-all hover:border-lime-700/40 hover:shadow-md hover:shadow-lime-700/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-lg font-bold">Mesa {order.tableId}</span>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {timeAgo(order.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className="gap-1 bg-lime-700/20 text-lime-400 border-lime-700/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Listo
                        </Badge>
                      </div>

                      <ScrollArea className="max-h-40 scrollbar-verve rounded-md">
                        <ul className="space-y-1.5 pr-2">
                          {order.items.map((it) => (
                            <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
                              <span className="min-w-0">
                                <span className="font-medium tabular-nums">{it.quantity}×</span>{' '}
                                <span className="truncate">{it.productName}</span>
                                {it.notes && (
                                  <p className="text-xs text-muted-foreground pl-5">↳ {it.notes}</p>
                                )}
                              </span>
                              <span className="text-xs uppercase text-muted-foreground shrink-0">
                                {it.station}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>

                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-lime-700/20 text-lime-400 hover:bg-lime-700/30 hover:text-lime-300"
                        disabled={deliveringId === order.id}
                        onClick={() => deliverOrder(order)}
                      >
                        {deliveringId === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Entregar
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-3 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Wine className="w-3 h-3" /> Notificaciones en tiempo real vía WebSocket
        </span>
      </footer>
    </div>
  )
}
