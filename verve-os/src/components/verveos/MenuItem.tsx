// MenuItem - Tarjeta de producto en el menú de mesa
'use client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus } from 'lucide-react'
import type { Product } from '@/lib/types'

interface MenuItemProps {
  product: Product
  quantity: number
  onAdd: () => void
  onRemove: () => void
  disabled?: boolean
}

// Paleta gastro-bar: dorado, cobre, oliva, vino, terracota
const CATEGORY_COLORS: Record<string, string> = {
  Entradas: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
  Principales: 'bg-rose-800/20 text-rose-400 border-rose-800/40',
  Bebidas: 'bg-lime-800/20 text-lime-400 border-lime-800/40',
  Barra: 'bg-yellow-600/15 text-yellow-500 border-yellow-600/30',
  Postres: 'bg-orange-800/20 text-orange-400 border-orange-800/40',
  General: 'bg-muted text-muted-foreground border-border',
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function MenuItem({ product, quantity, onAdd, onRemove, disabled }: MenuItemProps) {
  const available = product.available && product.stock > 0
  const catColor = CATEGORY_COLORS[product.category] ?? CATEGORY_COLORS.General

  return (
    <Card
      className={`relative p-4 flex flex-col gap-3 transition-all ${
        available ? 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5' : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight line-clamp-2">{product.name}</h3>
        <Badge variant="outline" className={`shrink-0 ${catColor}`}>
          {product.category}
        </Badge>
      </div>

      {product.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{product.description}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="font-bold text-primary">{formatPrice(product.price)}</span>
        {available ? (
          quantity > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={onRemove}
                disabled={disabled}
                aria-label={`Quitar uno de ${product.name}`}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-6 text-center font-semibold tabular-nums">{quantity}</span>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={onAdd}
                disabled={disabled}
                aria-label={`Añadir uno de ${product.name}`}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={onAdd} disabled={disabled} className="gap-1">
              <Plus className="w-4 h-4" /> Añadir
            </Button>
          )
        ) : (
          <Badge variant="outline" className="text-destructive border-destructive/30">
            Agotado
          </Badge>
        )}
      </div>

      {available && product.stock <= 5 && (
        <p className="text-xs text-amber-400/80">Solo {product.stock} disponibles</p>
      )}
    </Card>
  )
}
