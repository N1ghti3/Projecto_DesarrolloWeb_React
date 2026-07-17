// Cart - Carrito lateral para la vista de mesa
'use client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Trash2, ShoppingBag, Send, Minus, Plus } from 'lucide-react'
import type { CartItem } from '@/lib/types'
import { formatPrice } from './MenuItem'

interface CartProps {
  tableId: string
  items: CartItem[]
  onInc: (productId: string) => void
  onDec: (productId: string) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onCheckout: () => void
  sending?: boolean
  offline?: boolean
}

export function Cart({
  tableId,
  items,
  onInc,
  onDec,
  onRemove,
  onClear,
  onCheckout,
  sending,
  offline,
}: CartProps) {
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const count = items.reduce((sum, it) => sum + it.quantity, 0)

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Mesa {tableId}</h2>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Vaciar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{count} artículo(s) en el pedido</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 max-h-[50vh] scrollbar-verve">
        <div className="p-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">El carrito está vacío</p>
              <p className="text-xs mt-1">Añade productos del menú</p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.productId}
                className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(it.price)} c/u</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(it.productId)}
                    aria-label={`Quitar ${it.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDec(it.productId)}
                      aria-label={`Reducir ${it.name}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onInc(it.productId)}
                      aria-label={`Aumentar ${it.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(it.price * it.quantity)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-primary">{formatPrice(total)}</span>
        </div>
        <Separator />
        <Button
          className="w-full gap-2"
          size="lg"
          disabled={items.length === 0 || sending}
          onClick={onCheckout}
        >
          <Send className="w-4 h-4" />
          {offline ? 'Guardar offline' : 'Enviar pedido'}
        </Button>
        {offline && (
          <p className="text-xs text-amber-400/80 text-center">
            Sin conexión: el pedido se guardará y se sincronizará después
          </p>
        )}
      </div>
    </Card>
  )
}
