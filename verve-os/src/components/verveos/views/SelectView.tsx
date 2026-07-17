// SelectView - Menú principal de selección de módulos
'use client'
import { Card } from '@/components/ui/card'
import {
  Armchair,
  Settings,
  Users,
  ChefHat,
  Wine,
  Bell,
  LifeBuoy,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import type { User, View, Role } from '@/lib/types'
import { AppHeader } from '../AppHeader'

interface SelectViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

interface ModuleDef {
  key: string
  title: string
  desc: string
  emoji: string
  icon: typeof Armchair
  view: View
  allowedRoles: Role[]
  restrictionLabel?: string
}

export function SelectView({ user, online, navigate, onLogout }: SelectViewProps) {
  const modules: ModuleDef[] = [
    {
      key: 'tables',
      title: 'Mesas',
      desc: user.role === 'visor' ? 'Ver estado de mesas y tablets' : 'Gestión de mesas y abrir kiosk',
      emoji: '🪑',
      icon: Armchair,
      view: { name: 'tables' },
      allowedRoles: ['admin', 'mesero', 'barra', 'cocina', 'cajero', 'visor', 'mesa'],
    },
    {
      key: 'command',
      title: 'Productos',
      desc: 'Gestionar productos del menú',
      emoji: '⚙️',
      icon: Settings,
      view: { name: 'command' },
      allowedRoles: ['admin'],
      restrictionLabel: 'Solo admin',
    },
    {
      key: 'categories',
      title: 'Categorías',
      desc: 'Gestionar categorías del menú',
      emoji: '📂',
      icon: Settings,
      view: { name: 'categories' },
      allowedRoles: ['admin'],
      restrictionLabel: 'Solo admin',
    },
    {
      key: 'dashboard',
      title: 'Dashboard',
      desc: 'Ventas, estadísticas y reportes',
      emoji: '📊',
      icon: BarChart3,
      view: { name: 'dashboard' },
      allowedRoles: ['admin', 'cajero'],
    },
    {
      key: 'users',
      title: 'Usuarios',
      desc: 'Gestionar empleados y accesos',
      emoji: '👥',
      icon: Users,
      view: { name: 'users' },
      allowedRoles: ['admin'],
      restrictionLabel: 'Solo admin',
    },
    {
      key: 'cocina',
      title: 'Cocina',
      desc: 'Órdenes de comida en tiempo real',
      emoji: '🍳',
      icon: ChefHat,
      view: { name: 'station', station: 'cocina' },
      allowedRoles: ['admin', 'cocina', 'mesero'],
    },
    {
      key: 'barra',
      title: 'Barra',
      desc: 'Cocteles y bebidas en tiempo real',
      emoji: '🍸',
      icon: Wine,
      view: { name: 'station', station: 'barra' },
      allowedRoles: ['admin', 'barra', 'mesero'],
    },
    {
      key: 'waiter',
      title: 'Meseros',
      desc: 'Llamados y notificaciones',
      emoji: '🔔',
      icon: Bell,
      view: { name: 'waiter' },
      allowedRoles: ['admin', 'mesero'],
    },
    {
      key: 'contingency',
      title: 'Contingencia',
      desc: 'Modo offline',
      emoji: '🆘',
      icon: LifeBuoy,
      view: { name: 'contingency' },
      allowedRoles: ['admin', 'mesero', 'barra', 'cocina', 'cajero'],
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="VerveOS"
        subtitle="Panel de control"
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((m) => {
            const Icon = m.icon
            const allowed = m.allowedRoles.includes(user.role)
            const disabled = !allowed
            const restrictionLabel = m.restrictionLabel ?? 'Restringido'
            return (
              <button
                key={m.key}
                onClick={() => {
                  if (!disabled) navigate(m.view)
                }}
                disabled={disabled}
                aria-label={m.title}
                className={`group text-left transition-all ${
                  disabled
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                }`}
              >
                <Card className="p-6 h-full relative overflow-hidden rounded-xl transition-all group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 ring-1 ring-primary/20">
                      <span aria-hidden>{m.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-lg">{m.title}</h2>
                        {disabled && (
                          <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-semibold ring-1 ring-amber-500/30">
                            {restrictionLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        disabled
                          ? 'text-muted-foreground/50'
                          : 'text-muted-foreground group-hover:text-primary'
                      }`}
                    />
                  </div>
                </Card>
              </button>
            )
          })}
        </div>

        {!online && (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <LifeBuoy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400">Modo sin conexión activo</p>
              <p className="text-muted-foreground mt-0.5">
                Puedes seguir tomando pedidos desde el módulo de Contingencia. Se sincronizarán
                automáticamente al restablecerse la conexión.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">
        VerveOS · Sistema POS de Gastro-Bar · v2.0
      </footer>
    </div>
  )
}
