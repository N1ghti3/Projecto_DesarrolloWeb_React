import { useMemo } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from './MenuItem'
import { productEmoji } from '@/lib/emoji'
import type { Product, CartItem } from '@/lib/types'

interface MenuGridProps {
  products: Product[]
  loading: boolean
  search: string
  onSearchChange: (v: string) => void
  category: string
  cart: CartItem[]
  isViewer: boolean
  onAddToCart: (product: Product) => void
}

export function MenuGrid({ products, loading, search, onSearchChange, category, cart, isViewer, onAddToCart }: MenuGridProps) {
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === 'Todos' || p.category === category
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, category, search])

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="shrink-0 p-4 pb-2">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en el menú..."
            className="pl-12 h-12 text-base rounded-xl"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-verve px-4 pb-32">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const inCart = cart.find((i) => i.productId === p.id)
              const qty = inCart?.quantity ?? 0
              const available = p.available && p.stock > 0
              return (
                <div
                  key={p.id}
                  className={`group relative rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col transition-all ${
                    available ? 'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5' : 'opacity-60'
                  }`}
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center relative">
                    <span className="text-6xl sm:text-7xl" aria-hidden>
                      {productEmoji(p.name, p.category)}
                    </span>
                    {qty > 0 && (
                      <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg">
                        {qty}
                      </div>
                    )}
                    {!available && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Badge variant="outline" className="text-destructive border-destructive/40 bg-destructive/10">
                          Agotado
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    <div>
                      <h3 className="font-semibold leading-tight line-clamp-2 text-sm sm:text-base">{p.name}</h3>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                      )}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-primary text-sm sm:text-base">{formatPrice(p.price)}</span>
                      {available && !isViewer && (
                        <Button
                          size="sm"
                          className="gap-1.5 rounded-full h-9 px-3"
                          onClick={() => onAddToCart(p)}
                          aria-label={`Añadir ${p.name}`}
                        >
                          <Plus className="w-4 h-4" /> Añadir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
