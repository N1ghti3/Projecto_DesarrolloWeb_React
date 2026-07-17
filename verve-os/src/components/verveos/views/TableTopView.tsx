'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWebSocket } from '@/hooks/use-websocket'
import { wsService } from '@/lib/websocket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  WifiOff, Bell, UtensilsCrossed, ChevronLeft, Lock, Eye, Receipt, ShoppingCart,
} from 'lucide-react'
import { api, getDeviceToken, clearDeviceToken } from '@/lib/api'
import { cacheMenu, getCachedMenu } from '@/lib/menu-cache'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useContingencyStore } from '@/hooks/use-contingency-store'
import { useCart } from '@/hooks/use-cart'
import { CategorySidebar } from '../CategorySidebar'
import { MenuGrid } from '../MenuGrid'
import { OrderStatusBar } from '../OrderStatusBar'
import { CartSheet } from '../CartSheet'
import { KioskDialogs } from '../KioskDialogs'
import type { Product, Order, User, View } from '@/lib/types'

interface TableTopViewProps {
  user: User
  tableId: string
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

export function TableTopView({ user, tableId, online: parentOnline, navigate, onLogout }: TableTopViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [callWaiter, setCallWaiter] = useState(false)
  const [confirmation, setConfirmation] = useState<{ count: number; total: number } | null>(null)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [closingTable, setClosingTable] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const { online } = useNetworkStatus()
  const { addOrder } = useContingencyStore()
  const { cart, addToCart, removeFromCart, incItem, decItem, clearCart, totalCount, totalPrice } = useCart()

  const effectiveOnline = parentOnline && online

  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const isKiosk = !!deviceToken
  const isViewer = user.role === 'visor'
  const isAdminMode = user.role === 'admin'

  const [devMode, setDevMode] = useState(false)
  useEffect(() => {
    setDevMode(window.location.search.includes('dev=true'))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(`verveos_customer_${tableId}`)
    if (saved) {
      try {
        const { name, email } = JSON.parse(saved)
        if (name) setCustomerName(name)
        if (email) setCustomerEmail(email)
      } catch {}
    }
  }, [tableId])

  const saveCustomerData = useCallback((name: string, email: string) => {
    localStorage.setItem(`verveos_customer_${tableId}`, JSON.stringify({ name, email }))
  }, [tableId])

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

  useEffect(() => { loadMenu() }, [loadMenu])

  useWebSocket({
    events: {
      'table-orders': (list: unknown) => setMyOrders((list as Order[]) ?? []),
      'order:new': (order: unknown) => {
        const o = order as Order
        setMyOrders((prev) => (prev.find((p) => p.id === o.id) ? prev : [o, ...prev]))
      },
      'order:status': (order: unknown) => {
        const o = order as Order
        setMyOrders((prev) => {
          if (['pagado', 'entregado', 'cancelado'].includes(o.status)) {
            const updated = prev.map((p) => (p.id === o.id ? o : p))
            setTimeout(() => setMyOrders((cur) => cur.filter((p) => p.id !== o.id)), 4000)
            return updated
          }
          return prev.map((p) => (p.id === o.id ? o : p))
        })
      },
    },
    onConnect: () => {
      wsService.join(`table:${tableId}`)
      wsService.emit('request:table-orders', tableId)
    },
    deps: [tableId],
  })

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category))
    return ['Todos', ...Array.from(set)]
  }, [products])

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

  const doCheckout = async () => {
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
          tableId, notes,
          customerName: customerName || undefined,
          customerEmail: customerEmail || undefined,
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

  const handleCheckout = () => {
    if (cart.length === 0) return
    if (!customerName.trim() && !isViewer && !isAdminMode) {
      setCustomerDialogOpen(true)
      return
    }
    saveCustomerData(customerName, customerEmail)
    doCheckout()
  }

  const handleCustomerConfirm = () => {
    saveCustomerData(customerName, customerEmail)
    setCustomerDialogOpen(false)
    doCheckout()
  }

  const handleBackClick = () => {
    if (isKiosk && !devMode) {
      setPin('')
      setPinDialogOpen(true)
    } else if (user.role === 'mesa') {
      navigate({ name: 'tables' })
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
      <header className="shrink-0 border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-4 px-6 py-3">
          <button
            onClick={handleBackClick}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 flex items-center gap-1.5"
            aria-label={isKiosk && !devMode ? 'Cerrar sesión' : 'Volver'}
            title={isKiosk && !devMode ? 'Cerrar sesión (staff)' : 'Volver al inicio'}
          >
            {isKiosk && !devMode ? <Lock className="w-4 h-4" /> : <ChevronLeft className="w-5 h-5" />}
            {isKiosk && !devMode && <span className="text-xs font-medium hidden sm:inline">Cerrar</span>}
            {devMode && <span className="text-xs font-medium hidden sm:inline">Volver (dev)</span>}
          </button>

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

          {!effectiveOnline && (
            <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" /> Sin conexión
            </Badge>
          )}

          {!isViewer && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate({ name: 'bill', tableId })}>
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver cuenta</span>
            </Button>
          )}

          {!isViewer && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCallWaiter} disabled={callWaiter}>
              <Bell className={`w-4 h-4 ${callWaiter ? 'animate-pulse text-primary' : ''}`} />
              <span className="hidden sm:inline">{callWaiter ? 'Llamando...' : 'Llamar mesero'}</span>
            </Button>
          )}
          {isViewer && (
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 text-primary">
              <Eye className="w-3.5 h-3.5" /> Solo lectura
            </Badge>
          )}
          {isAdminMode && !isKiosk && (
            <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 text-primary">
              <Eye className="w-3.5 h-3.5" /> Admin
            </Badge>
          )}
        </div>
      </header>

      <OrderStatusBar orders={myOrders} />

      <div className="flex-1 flex min-h-0">
        <CategorySidebar categories={categories} active={category} onSelect={setCategory} />
        <MenuGrid
          products={products}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          category={category}
          cart={cart}
          isViewer={isViewer}
          onAddToCart={addToCart}
        />
      </div>

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
          <span className="text-muted-foreground/50 mx-1">|</span>
          <span className="font-bold tabular-nums">{totalPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</span>
        </button>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        notes={notes}
        onNotesChange={setNotes}
        totalCount={totalCount}
        totalPrice={totalPrice}
        online={effectiveOnline}
        sending={sending}
        onIncrement={incItem}
        onDecrement={decItem}
        onRemove={removeFromCart}
        onClear={clearCart}
        onCheckout={handleCheckout}
        tableId={tableId}
      />

      <KioskDialogs
        confirmation={confirmation}
        onDismissConfirmation={() => setConfirmation(null)}
        customerDialogOpen={customerDialogOpen}
        onCustomerDialogChange={setCustomerDialogOpen}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerEmail={customerEmail}
        onCustomerEmailChange={setCustomerEmail}
        onCustomerConfirm={handleCustomerConfirm}
        pinDialogOpen={pinDialogOpen}
        onPinDialogChange={(v) => { if (!v) setPin(''); setPinDialogOpen(v) }}
        pin={pin}
        onPinChange={setPin}
        onCloseTable={handleCloseTable}
        closingTable={closingTable}
        tableId={tableId}
      />
    </div>
  )
}
