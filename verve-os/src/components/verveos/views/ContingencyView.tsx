// ContingencyView - Pedidos offline guardados en localStorage + sincronización
'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LifeBuoy,
  Trash2,
  RefreshCw,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useContingencyStore } from '@/hooks/use-contingency-store'
import type { User, View } from '@/lib/types'
import { formatPrice } from '../MenuItem'
import { AppHeader } from '../AppHeader'
import { ConfirmModal } from '../ConfirmModal'

interface ContingencyViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

export function ContingencyView({ user, online: parentOnline, navigate, onLogout }: ContingencyViewProps) {
  const { orders, removeOrders, clearAll } = useContingencyStore()
  const { online } = useNetworkStatus()
  const [syncing, setSyncing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const effectiveOnline = parentOnline && online
  const total = orders.reduce((s, o) => s + o.total, 0)

  const sync = useCallback(async () => {
    if (orders.length === 0) {
      toast.info('No hay pedidos por sincronizar')
      return
    }
    if (!effectiveOnline) {
      toast.error('Sin conexión a internet', {
        description: 'Conéctate a una red para sincronizar.',
      })
      return
    }
    setSyncing(true)
    try {
      const payload = orders.map((o) => ({
        localId: o.localId,
        tableId: o.tableId,
        notes: o.notes,
        total: o.total,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          notes: i.notes,
        })),
      }))
      const res = await api.syncContingency(payload)
      removeOrders(res.synced)
      if (res.errors && res.errors.length > 0) {
        toast.warning(`${res.count} pedido(s) sincronizado(s), ${res.errors.length} con error`, {
          description: res.errors.map((e) => e.reason).join(' · '),
          duration: 6000,
        })
      } else {
        toast.success(`${res.count} pedido(s) sincronizado(s)`, {
          description: 'Ya están disponibles en la barra.',
        })
      }
    } catch (err) {
      toast.error('Error al sincronizar', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSyncing(false)
    }
  }, [orders, effectiveOnline, removeOrders])

  // Auto-sincronización al recuperar conexión
  useEffect(() => {
    if (effectiveOnline && orders.length > 0 && !syncing) {
      const t = setTimeout(() => {
        sync()
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [effectiveOnline, orders.length, syncing, sync])

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={effectiveOnline}
        title="Modo Contingencia"
        subtitle={`${orders.length} pedido(s) guardado(s) localmente`}
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      {/* Banner de estado de conexión */}
      <div
        className={`px-4 py-3 border-b flex items-center gap-3 text-sm ${
          effectiveOnline
            ? 'border-lime-600/30 bg-lime-600/5 text-lime-400'
            : 'border-amber-500/30 bg-amber-500/5 text-amber-400'
        }`}
      >
        {effectiveOnline ? <Wifi className="w-5 h-5 shrink-0" /> : <WifiOff className="w-5 h-5 shrink-0" />}
        <div className="flex-1">
          <p className="font-medium">
            {effectiveOnline ? 'Conexión restablecida' : 'Sin conexión a internet'}
          </p>
          <p className="text-xs opacity-80">
            {effectiveOnline
              ? orders.length > 0
                ? 'Sincronizando pedidos automáticamente...'
                : 'Los pedidos se enviarán directamente al servidor.'
              : 'Los pedidos se guardan en este dispositivo y se enviarán cuando vuelva la conexión.'}
          </p>
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto">
        {/* Resumen + acciones */}
        <Card className="p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CloudOff className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">pedidos pendientes de sincronizar</p>
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-12 mx-2" />
              <div className="hidden sm:block">
                <p className="text-2xl font-bold text-primary">{formatPrice(total)}</p>
                <p className="text-xs text-muted-foreground">total acumulado</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={sync}
                disabled={syncing || orders.length === 0}
                className="gap-2"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
              {orders.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmClear(true)}
                  className="text-destructive hover:text-destructive gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Borrar todo
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Lista de pedidos offline */}
        {orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-lime-600/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-lime-400" />
            </div>
            <p className="text-lg font-medium">Todo sincronizado</p>
            <p className="text-sm mt-1">No hay pedidos pendientes en el almacenamiento local.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] scrollbar-verve">
            <div className="space-y-3 pr-1">
              {orders.map((o) => (
                <Card key={o.localId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LifeBuoy className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold">Mesa {o.tableId}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                        offline
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm">
                    {o.items.map((it, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span>
                          <span className="font-medium tabular-nums">{it.quantity}×</span> {it.name}
                        </span>
                        <span className="text-muted-foreground">{formatPrice(it.price * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  {o.notes && (
                    <p className="text-xs text-amber-400/90 mt-2 bg-amber-500/5 rounded-md p-2 border border-amber-500/20">
                      Nota: {o.notes}
                    </p>
                  )}

                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold text-primary">{formatPrice(o.total)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-3 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Almacenamiento local · Sincronización automática al reconectar
        </span>
      </footer>

      <ConfirmModal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Borrar todos los pedidos offline"
        description="Se eliminarán permanentemente del dispositivo los pedidos sin sincronizar. Esta acción no se puede deshacer."
        confirmText="Borrar todo"
        destructive
        onConfirm={() => {
          clearAll()
          toast.success('Pedidos offline eliminados')
        }}
      />
    </div>
  )
}
