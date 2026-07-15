// TableTopView - Vista kiosk para tablet (orientación landscape).
// El cliente navega el menú, arma su pedido y lo envía directamente a la barra.
// Diseño inmersivo: sidebar de categorías, grid de cards grandes, carrito en Sheet.
//
// Modos de uso:
// - "device mode" (kiosk): tablet con token de dispositivo (sin login de staff).
// - "staff mode": usuario logueado probando el kiosk.
// El modo dispositivo se detecta con getDeviceToken(). Si hay token, los pedidos
// y llamados van con useDevice=true, y el botón "Volver" requiere PIN de staff
// para cerrar la mesa y limpiar el token.
'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  WifiOff,
  Bell,
  CheckCircle2,
  UtensilsCrossed,
  ChevronLeft,
  Loader2,
  X,
  Lock,
  Clock,
  Eye,
} from 'lucide-react'
import { api, getDeviceToken, clearDeviceToken } from '@/lib/api'
import { cacheMenu, getCachedMenu } from '@/lib/menu-cache'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useContingencyStore } from '@/hooks/use-contingency-store'
import { CATEGORY_EMOJI, productEmoji } from '@/lib/emoji'
import { formatPrice } from '../MenuItem'
import type { Product, CartItem, Order, User, View } from '@/lib/types'

interface TableTopViewProps {
  user: User
  tableId: string
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

// Estados de orden mostrados en la barra "Tus pedidos"
const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  en_preparacion: { label: 'En preparación', color: 'border-orange-700/40 bg-orange-700/15 text-orange-400' },
  listo: { label: 'Listo', color: 'border-lime-600/30 bg-lime-600/10 text-lime-400' },
  entregado: { label: 'Entregado', color: 'border-muted-foreground/30 bg-muted/30 text-muted-foreground' },
  cancelado: { label: 'Cancelado', color: 'border-rose-800/40 bg-rose-800/15 text-rose-400' },
  pagado: { label: 'Pagado', color: 'border-primary/30 bg-primary/10 text-primary' },
}

export function TableTopView({ user, tableId, online: parentOnline, navigate, onLogout }: TableTopViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [callWaiter, setCallWaiter] = useState(false)
  const [confirmation, setConfirmation] = useState<{ count: number; total: number } | null>(null)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [closingTable, setClosingTable] = useState(false)
  const { online } = useNetworkStatus()
  const { addOrder } = useContingencyStore()
  const socketRef = useRef<Socket | null>(null)

  const effectiveOnline = parentOnline && online

  // Detectar modo dispositivo (kiosk real) vs staff vs visor (solo lectura)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const isKiosk = !!deviceToken
  const isViewer = user.role === 'visor'

  useEffect(() => {
    setDeviceToken(getDeviceToken())
  }, [])

  const loadMenu = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listMenu()
      setProducts(res.products)
      cacheMenu(res.products)
    } catch (err) {
      const cached = getCachedMenu()
      if (cached && cached.length > 0) {
        setProducts(cached)
        toast.info('Mostrando menú en caché (sin conexión)')
      } else {
        toast.error('No se pudo cargar el menú', {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // ----- WebSocket: feedback de "Tus pedidos" en tiempo real -----
  useEffect(() => {
    if (!tableId) return
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
      socket.emit('join', `table:${tableId}`)
      socket.emit('request:table-orders', tableId)
    })

    socket.on('table-orders', (list: Order[]) => {
      setMyOrders(list ?? [])
    })

    socket.on('order:new', (order: Order) => {
      setMyOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev
        return [order, ...prev]
      })
    })

    socket.on('order:status', (order: Order) => {
      setMyOrders((prev) => {
        if (order.status === 'pagado' || order.status === 'entregado' || order.status === 'cancelado') {
          // Remover tras 4s para que el cliente vea el cambio final
          const updated = prev.map((o) => (o.id === order.id ? order : o))
          setTimeout(() => {
            setMyOrders((cur) => cur.filter((o) => o.id !== order.id))
          }, 4000)
          return updated
        }
        return prev.map((o) => (o.id === order.id ? order : o))
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [tableId])

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category))
    return ['Todos', ...Array.from(set)]
  }, [products])

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

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const incItem = useCallback((productId: string) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)))
  }, [])

  const decItem = useCallback((productId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const totalCount = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  const handleCallWaiter = async () => {
    if (callWaiter) return
    setCallWaiter(true)
    try {
      await api.callWaiter({ tableNumber: tableId, reason: 'mesero' }, isKiosk)
      toast.success('Mesero notificado', { description: `Mesa ${tableId}` })
    } catch (err) {
      toast.error('No se pudo notificar al mesero', {
        description: err instanceof Error ? err.message : undefined,
      })
      setCallWaiter(false)
      return
    }
    setTimeout(() => setCallWaiter(false), 5000)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    const total = totalPrice
    const count = totalCount

    if (!effectiveOnline) {
      addOrder({ tableId, notes, items: cart, total })
      clearCart()
      setNotes('')
      setCartOpen(false)
      setConfirmation({ count, total })
      return
    }

    setSending(true)
    try {
      await api.createOrder(
        {
          tableId,
          notes,
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })),
        },
        isKiosk
      )
      clearCart()
      setNotes('')
      setCartOpen(false)
      setConfirmation({ count, total })
    } catch (err) {
      addOrder({ tableId, notes, items: cart, total })
      clearCart()
      setNotes('')
      setCartOpen(false)
      setConfirmation({ count, total })
      toast.warning('Pedido guardado para sincronizar', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSending(false)
    }
  }

  // Botón "Volver" / "Cerrar sesión"
  const handleBackClick = () => {
    if (isKiosk) {
      setPin('')
      setPinDialogOpen(true)
    } else {
      navigate({ name: 'select' })
    }
  }

  const handleCloseTable = async () => {
    if (!pin.trim()) {
      toast.error('Ingresa el PIN de staff')
      return
    }
    setClosingTable(true)
    try {
      await api.closeTable(tableId, pin.trim())
      clearDeviceToken()
      setDeviceToken(null)
      setPinDialogOpen(false)
      setPin('')
      toast.success('Mesa cerrada', { description: `Mesa ${tableId}` })
      navigate({ name: 'tables' })
    } catch (err) {
      toast.error('No se pudo cerrar la mesa', {
        description: err instanceof Error ? err.message : 'Verifica el PIN e intenta de nuevo',
      })
    } finally {
      setClosingTable(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Barra superior minimalista */}
      <header className="shrink-0 border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-4 px-6 py-3">
          {/* Volver / Cerrar sesión (protegido en modo kiosk) */}
          <button
            onClick={handleBackClick}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 flex items-center gap-1.5"
            aria-label={isKiosk ? 'Cerrar sesión' : 'Volver'}
            title={isKiosk ? 'Cerrar sesión (staff)' : 'Volver (staff)'}
          >
            {isKiosk ? <Lock className="w-4 h-4" /> : <ChevronLeft className="w-5 h-5" />}
            {isKiosk && <span className="text-xs font-medium hidden sm:inline">Cerrar</span>}
          </button>

          {/* Marca + mesa */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">
                Verve<span className="text-primary">OS</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Mesa {tableId}</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Estado conexión discreto */}
          {!effectiveOnline && (
            <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Sin conexión
            </Badge>
          )}

          {/* Llamar mesero (notificación real) — oculto para visor */}
          {!isViewer && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCallWaiter}
              disabled={callWaiter}
            >
              <Bell className={`w-4 h-4 ${callWaiter ? 'animate-pulse text-primary' : ''}`} />
              <span className="hidden sm:inline">{callWaiter ? 'Llamando...' : 'Llamar mesero'}</span>
            </Button>
          )}
          {isViewer && (
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 text-primary">
              <Eye className="w-3.5 h-3.5" /> Solo lectura
            </Badge>
          )}
        </div>
      </header>

      {/* Barra "Tus pedidos" - feedback en tiempo real del cliente */}
      {myOrders.length > 0 && (
        <div className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-2.5 max-h-20 overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tus pedidos
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-verve pb-1">
            {myOrders.map((o) => {
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
      )}

      {/* Cuerpo: sidebar categorías + grid productos */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar de categorías */}
        <nav className="shrink-0 w-24 sm:w-32 lg:w-40 border-r border-border/60 bg-card/30 flex flex-col py-3 gap-1 overflow-y-auto scrollbar-verve">
          {categories.map((cat) => {
            const active = category === cat
            const emoji = CATEGORY_EMOJI[cat] ?? '🍽️'
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex flex-col items-center gap-1.5 px-2 py-3 mx-2 rounded-xl transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-2xl sm:text-3xl leading-none" aria-hidden>{emoji}</span>
                <span className="text-[11px] sm:text-xs font-medium leading-tight text-center">{cat}</span>
              </button>
            )
          })}
        </nav>

        {/* Main: búsqueda + grid */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Búsqueda */}
          <div className="shrink-0 p-4 pb-2">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en el menú..."
                className="pl-12 h-12 text-base rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grid de productos */}
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
                      {/* Emoji / visual */}
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

                      {/* Info */}
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
                              onClick={() => addToCart(p)}
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
      </div>

      {/* Botón flotante "Ver pedido" */}
      {totalCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-primary text-primary-foreground pl-5 pr-6 py-3.5 shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background text-primary text-xs font-bold flex items-center justify-center ring-2 ring-primary">
              {totalCount}
            </span>
          </div>
          <span className="font-semibold">Ver pedido</span>
          <Separator orientation="vertical" className="h-6 bg-primary-foreground/30" />
          <span className="font-bold tabular-nums">{formatPrice(totalPrice)}</span>
        </button>
      )}

      {/* Sheet: Carrito */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
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

          {/* Items */}
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
                        onClick={() => decItem(it.productId)}
                        aria-label={`Reducir ${it.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => incItem(it.productId)}
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
                      onClick={() => removeFromCart(it.productId)}
                      aria-label={`Quitar ${it.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Notas */}
                <div className="pt-2">
                  <label htmlFor="kiosk-notes" className="text-xs font-medium text-muted-foreground">
                    Notas para la cocina (opcional)
                  </label>
                  <Textarea
                    id="kiosk-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: sin cebolla, término medio, salsa aparte..."
                    rows={2}
                    className="mt-1.5 resize-none"
                  />
                </div>

                {/* Vaciar */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Vaciar pedido
                </Button>
              </div>
            )}
          </div>

          {/* Footer del carrito */}
          {cart.length > 0 && (
            <div className="shrink-0 border-t border-border/60 px-5 py-4 space-y-3 bg-card/50">
              {!effectiveOnline && (
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
                onClick={handleCheckout}
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

      {/* Diálogo de confirmación tras enviar */}
      <Dialog open={!!confirmation} onOpenChange={(o) => !o && setConfirmation(null)}>
        <DialogContent className="max-w-sm text-center [&>button]:hidden">
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 rounded-full bg-lime-600/15 flex items-center justify-center mb-4 ring-4 ring-lime-600/10">
              <CheckCircle2 className="w-12 h-12 text-lime-400" />
            </div>
            <DialogTitle className="text-2xl">¡Pedido enviado!</DialogTitle>
            <DialogDescription className="text-base mt-1">
              Tu pedido de <span className="font-semibold text-foreground">{confirmation?.count} artículo(s)</span> por{' '}
              <span className="font-semibold text-primary">{confirmation ? formatPrice(confirmation.total) : ''}</span> fue
              enviado a la barra.
            </DialogDescription>
            <p className="text-sm text-muted-foreground mt-2">
              La cocina lo preparará en breve. ¡Gracias por tu orden!
            </p>
            <Button
              className="mt-6 w-full h-12 text-base"
              onClick={() => setConfirmation(null)}
            >
              Seguir pidiendo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de PIN para cerrar mesa (modo kiosk) */}
      <Dialog open={pinDialogOpen} onOpenChange={(o) => !o && setPin('')}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Cerrar sesión de mesa
            </DialogTitle>
            <DialogDescription>
              Ingresa el PIN de staff para cerrar la mesa <span className="font-semibold text-foreground">{tableId}</span> y
              liberar el dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="staff-pin" className="text-xs">PIN de staff</Label>
            <Input
              id="staff-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCloseTable()
              }}
              placeholder="••••"
              className="tabular-nums tracking-widest text-center text-lg"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPinDialogOpen(false)
                setPin('')
              }}
              disabled={closingTable}
            >
              Cancelar
            </Button>
            <Button onClick={handleCloseTable} disabled={closingTable || !pin.trim()} className="gap-2">
              {closingTable ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando…</>
              ) : (
                <><Lock className="w-4 h-4" /> Cerrar mesa</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
