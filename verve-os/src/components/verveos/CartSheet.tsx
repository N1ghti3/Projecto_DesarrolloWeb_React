import { ShoppingCart, Minus, Plus, Trash2, Send, WifiOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatPrice } from './MenuItem'
import { productEmoji } from '@/lib/emoji'
import type { CartItem } from '@/lib/types'

interface CartSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  cart: CartItem[]
  notes: string
  onNotesChange: (v: string) => void
  totalCount: number
  totalPrice: number
  online: boolean
  sending: boolean
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onCheckout: () => void
  tableId: string
}

export function CartSheet({
  open, onOpenChange, cart, notes, onNotesChange, totalCount, totalPrice,
  online, sending, onIncrement, onDecrement, onRemove, onClear, onCheckout, tableId,
}: CartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border/60 space-y-0">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Tu pedido · Mesa {tableId}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Revisa tu pedido antes de enviarlo a la barra.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-verve px-5 py-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Tu pedido está vacío</p>
              <p className="text-sm mt-1">Añade productos del menú para empezar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((it) => (
                <div
                  key={it.productId}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center text-2xl shrink-0">
                    {productEmoji(it.name, '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(it.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onDecrement(it.productId)}
                      aria-label={`Reducir ${it.name}`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onIncrement(it.productId)}
                      aria-label={`Aumentar ${it.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(it.price * it.quantity)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => onRemove(it.productId)}
                    aria-label={`Quitar ${it.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              <div className="pt-2">
                <Label htmlFor="kiosk-notes" className="text-xs font-medium text-muted-foreground">
                  Notas para la cocina (opcional)
                </Label>
                <Textarea
                  id="kiosk-notes"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Ej: sin cebolla, término medio, salsa aparte..."
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={onClear}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Vaciar pedido
              </Button>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="shrink-0 border-t border-border/60 px-5 py-4 space-y-3 bg-card/50">
            {!online && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Sin conexión: el pedido se guardará y enviará después.</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total ({totalCount} artículos)</span>
              <span className="text-2xl font-bold text-primary tabular-nums">{formatPrice(totalPrice)}</span>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 h-12 text-base"
              onClick={onCheckout}
              disabled={sending}
            >
              {sending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-5 h-5" /> Enviar pedido a la barra</>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
