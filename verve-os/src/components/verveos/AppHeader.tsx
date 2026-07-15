// AppHeader - Cabecera común con marca, usuario y estado de conexión
'use client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wifi, WifiOff, LogOut, ChevronLeft, UtensilsCrossed } from 'lucide-react'
import type { User } from '@/lib/types'

interface AppHeaderProps {
  user: User | null
  online: boolean
  title: string
  subtitle?: string
  onBack?: () => void
  onLogout: () => void
}

export function AppHeader({ user, online, title, subtitle, onBack, onLogout }: AppHeaderProps) {
  const initials = user
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver" className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>

        <Badge
          variant="outline"
          className={`hidden sm:inline-flex gap-1.5 ${
            online
              ? 'border-lime-600/30 bg-lime-600/10 text-lime-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}
        >
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'En línea' : 'Sin conexión'}
        </Badge>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Menú de usuario">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
                <p className="text-xs text-primary capitalize font-normal">Rol: {user.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
