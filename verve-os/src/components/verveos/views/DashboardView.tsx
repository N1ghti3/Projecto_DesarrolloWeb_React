'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Timer,
  BarChart3,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { User, View, DashboardData } from '@/lib/types'
import { AppHeader } from '../AppHeader'
import { formatPrice } from '../MenuItem'

interface DashboardViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: '#D97706',
  en_preparacion: '#EA580C',
  listo: '#65A30D',
  entregado: '#6B7280',
  cancelado: '#E11D48',
  pagado: '#22C55E',
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'Preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  pagado: 'Pagado',
}

const PAYMENT_COLORS = ['#22C55E', '#3B82F6', '#A855F7']
const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export function DashboardView({ user, online, navigate, onLogout }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.getDashboard()
      setData(res)
    } catch (err) {
      toast.error('No se pudo cargar el dashboard', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader user={user} online={online} title="Dashboard" onBack={() => navigate({ name: 'select' })} onLogout={onLogout} />
        <div className="flex-1 p-6 space-y-4 max-w-6xl mx-auto w-full">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const statusChartData = Object.entries(data?.ordersByStatus ?? {})
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v, fill: STATUS_COLORS[k] ?? '#6B7280' }))

  const paymentChartData = Object.entries(data?.salesByPayment ?? {})
    .filter(([_, v]) => v > 0)
    .map(([k, v], i) => ({ name: PAYMENT_LABELS[k] ?? k, value: Math.round(v), fill: PAYMENT_COLORS[i] ?? '#6B7280' }))

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Dashboard"
        subtitle="Resumen del día"
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos hoy</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatPrice(data?.today.revenue ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">IVA: {formatPrice(data?.today.tax ?? 0)}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Órdenes hoy</p>
                <p className="text-2xl font-bold mt-1">{data?.today.orders ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{data?.today.paidOrders ?? 0} pagadas</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Mesas</p>
                <p className="text-2xl font-bold mt-1">
                  {data?.tables.active ?? 0}
                  <span className="text-base text-muted-foreground font-normal">/{data?.tables.total ?? 0}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-lime-600/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-lime-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{data?.tables.free ?? 0} libres</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Ticket Promedio</p>
                <p className="text-2xl font-bold mt-1">
                  {data?.today.paidOrders ? formatPrice(Math.round(data.today.revenue / data.today.paidOrders)) : '$0'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">por orden pagada</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Órdenes por estado */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              Órdenes por estado
            </h3>
            {statusChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos hoy</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Ventas por método de pago */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              Ventas por método de pago
            </h3>
            {paymentChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas hoy</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: $${(value / 1000).toFixed(1)}k`}>
                    {paymentChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Productos más vendidos */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Productos más vendidos hoy
          </h3>
          {!data?.topProducts || data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay ventas registradas hoy</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{p.quantity} vendido(s)</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums">{formatPrice(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <footer className="mt-auto border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Datos en vivo del día
        </span>
      </footer>
    </div>
  )
}
