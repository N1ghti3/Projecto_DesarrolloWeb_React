import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from './MenuItem'
import type { Order } from '@/lib/types'

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  en_preparacion: { label: 'En preparación', color: 'border-orange-700/40 bg-orange-700/15 text-orange-400' },
  listo: { label: 'Listo', color: 'border-lime-600/30 bg-lime-600/10 text-lime-400' },
  entregado: { label: 'Entregado', color: 'border-muted-foreground/30 bg-muted/30 text-muted-foreground' },
  cancelado: { label: 'Cancelado', color: 'border-rose-800/40 bg-rose-800/15 text-rose-400' },
  pagado: { label: 'Pagado', color: 'border-primary/30 bg-primary/10 text-primary' },
}

interface OrderStatusBarProps {
  orders: Order[]
}

export function OrderStatusBar({ orders }: OrderStatusBarProps) {
  if (orders.length === 0) return null

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-2.5 max-h-20 overflow-hidden">
      <div className="flex items-center gap-2 mb-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tus pedidos</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-verve pb-1">
        {orders.map((o) => {
          const meta = ORDER_STATUS_META[o.status] ?? ORDER_STATUS_META.pendiente
          const count = o.items.reduce((s, i) => s + i.quantity, 0)
          return (
            <div
              key={o.id}
              className="shrink-0 min-w-[180px] rounded-lg border border-border/60 bg-card px-3 py-2 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {count} art.
                </span>
                <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                  {meta.label}
                </Badge>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatPrice(o.total)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
