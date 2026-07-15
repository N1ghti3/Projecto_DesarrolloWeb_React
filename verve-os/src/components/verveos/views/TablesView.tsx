// TablesView - Gestión de mesas: estado (libre/ocupada/cobrada) y acciones rápidas
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Armchair,
  Receipt,
  Lock,
  Unlock,
  Plus,
  Loader2,
  RefreshCw,
  Tablet,
} from 'lucide-react'
import { api, clearDeviceToken } from '@/lib/api'
import type { TableInfo, TableStatus, User, View } from '@/lib/types'
import { AppHeader } from '../AppHeader'
import { ConfirmModal } from '../ConfirmModal'
import { formatPrice } from '../MenuItem'

interface TablesViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

// Estado de mesa: libre=oliva (lime), ocupada=ámbar, cobrada=muted
const STATUS_META: Record<
  TableStatus,
  { label: string; color: string; dot: string }
> = {
  libre: { label: 'Libre', color: 'bg-lime-700/15 text-lime-400 border-lime-700/40', dot: 'bg-lime-500' },
  ocupada: { label: 'Ocupada', color: 'bg-amber-600/15 text-amber-400 border-amber-600/30', dot: 'bg-amber-500' },
  cobrada: { label: 'Cobrada', color: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
}

export function TablesView({ user, online, navigate, onLogout }: TablesViewProps) {
  const isViewer = user.role === 'visor'
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmTable, setConfirmTable] = useState<TableInfo | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const loadTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.listTables()
      setTables(res.tables)
    } catch (err) {
      toast.error('No se pudieron cargar las mesas', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadTables()

    // WebSocket: unirse a 'staff' y recargar al recibir 'table:update'
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
      socket.emit('join', 'staff')
    })

    socket.on('table:update', () => {
      // Recarga silenciosa para reflejar el nuevo estado de la mesa
      loadTables(true)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [loadTables])

  const closeTable = async (table: TableInfo) => {
    setActionLoading(table.number)
    try {
      await api.closeTable(table.number)
      toast.success(`Mesa ${table.number} liberada`)
      setConfirmTable(null)
      // La actualización llegará por WS, pero optimizamos localmente
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: 'libre', activeOrders: 0, openTotal: 0 } : t))
      )
    } catch (err) {
      toast.error('No se pudo liberar la mesa', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setActionLoading(null)
    }
  }

  const summary = tables.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1
      return acc
    },
    {} as Record<TableStatus, number>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Mesas"
        subtitle="Gestión de mesas"
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      {/* Toolbar: resumen + refresh */}
      <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1.5 border-lime-700/40 text-lime-400">
          <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
          {summary.libre ?? 0} libres
        </Badge>
        <Badge variant="outline" className="gap-1.5 border-amber-600/30 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {summary.ocupada ?? 0} ocupadas
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          {summary.cobrada ?? 0} cobradas
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => loadTables(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Armchair className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No hay mesas configuradas</p>
            <p className="text-sm">Crea mesas desde el panel de administración.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {tables.map((table) => {
              const meta = STATUS_META[table.status]
              const isBusy = actionLoading === table.number
              return (
                <Card
                  key={table.id}
                  className={`p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:shadow-primary/5 ${
                    table.status === 'ocupada'
                      ? 'border-amber-600/30'
                      : table.status === 'cobrada'
                        ? 'opacity-80'
                        : 'hover:border-lime-700/40'
                  }`}
                >
                  {/* Cabecera: número de mesa + icono */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-11 h-11 rounded-lg flex items-center justify-center ring-1 ${
                          table.status === 'libre'
                            ? 'bg-lime-700/10 ring-lime-700/20'
                            : table.status === 'ocupada'
                              ? 'bg-amber-600/10 ring-amber-600/20'
                              : 'bg-muted ring-border'
                        }`}
                      >
                        <Armchair
                          className={`w-6 h-6 ${
                            table.status === 'libre'
                              ? 'text-lime-400'
                              : table.status === 'ocupada'
                                ? 'text-amber-400'
                                : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-2xl font-bold leading-none">{table.number}</span>
                        {table.name && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                            {table.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`gap-1.5 ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </Badge>
                  </div>

                  {/* Info de ocupación */}
                  {table.status === 'ocupada' && (
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-border/60 bg-muted/30 p-2.5 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Pedidos</p>
                        <p className="font-semibold tabular-nums">{table.activeOrders ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-primary tabular-nums">
                          {formatPrice(table.openTotal ?? 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Acciones según estado (visor = solo lectura) */}
                  <div className="mt-auto pt-1 space-y-2">
                    {table.status === 'libre' && !isViewer && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 border-lime-700/40 text-lime-400 hover:bg-lime-700/10 hover:text-lime-300"
                        disabled={isBusy}
                        onClick={() => {
                          clearDeviceToken()
                          navigate({ name: 'kiosk-unlock', tableId: table.number })
                        }}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                        Abrir mesa
                      </Button>
                    )}
                    {table.status === 'libre' && isViewer && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        Mesa disponible
                      </div>
                    )}

                    {table.status === 'ocupada' && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                          disabled={isBusy}
                          onClick={() => navigate({ name: 'kiosk', tableId: table.number })}
                        >
                          <Tablet className="w-3.5 h-3.5" />
                          Ver tablet {isViewer ? '' : '(cliente)'}
                        </Button>
                        {!isViewer && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={isBusy}
                              onClick={() => navigate({ name: 'bill', tableId: table.number })}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Ver cuenta
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isBusy}
                              onClick={() => setConfirmTable(table)}
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                              Cerrar
                            </Button>
                          </div>
                        )}
                        {isViewer && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1.5"
                            onClick={() => navigate({ name: 'bill', tableId: table.number })}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Ver cuenta
                          </Button>
                        )}
                      </div>
                    )}

                    {table.status === 'cobrada' && !isViewer && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        disabled={isBusy}
                        onClick={() => closeTable(table)}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Liberar
                      </Button>
                    )}
                    {table.status === 'cobrada' && isViewer && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        Cuenta cerrada
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-3 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Armchair className="w-3 h-3" /> {tables.length} mesa(s) · Actualización en tiempo real
        </span>
      </footer>

      {/* Confirmación de cierre de mesa */}
      <ConfirmModal
        open={!!confirmTable}
        onOpenChange={(o) => !o && setConfirmTable(null)}
        title={`¿Cerrar Mesa ${confirmTable?.number}?`}
        description={
          confirmTable
            ? `Se liberará la mesa con ${confirmTable.activeOrders ?? 0} pedido(s) activo(s) y un total de ${formatPrice(confirmTable.openTotal ?? 0)}. Asegúrate de haber cobrado antes de cerrar.`
            : ''
        }
        confirmText="Cerrar mesa"
        cancelText="Cancelar"
        destructive
        onConfirm={() => confirmTable && closeTable(confirmTable)}
      />
    </div>
  )
}
