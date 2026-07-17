// LoginView - Pantalla de inicio de sesión
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UtensilsCrossed, LogIn, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export function LoginView() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Completa email y contraseña')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const u = await login(email.trim(), password)
        toast.success(`Bienvenido, ${u.name}`)
      } else {
        if (!name.trim()) {
          toast.error('Ingresa tu nombre')
          return
        }
        const u = await register({ name: name.trim(), email: email.trim(), password })
        toast.success(`Cuenta creada. ¡Bienvenido, ${u.name}!`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: 'admin' | 'mesero' | 'barra') => {
    const creds = {
      admin: { email: 'admin@verveos.com', password: 'admin123' },
      mesero: { email: 'mesero@verveos.com', password: 'mesero123' },
      barra: { email: 'barra@verveos.com', password: 'barra123' },
    }[role]
    setEmail(creds.email)
    setPassword(creds.password)
    setMode('login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6" suppressHydrationWarning>
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-3 ring-1 ring-primary/30">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Verve<span className="text-primary">OS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema POS de Restaurante</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Registra un nuevo usuario del sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="pl-9"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@verveos.com"
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                <LogIn className="w-4 h-4" />
                {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
              </Button>
            </form>

            <div className="text-center mt-4 text-sm">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  ¿No tienes cuenta? <span className="text-primary font-medium">Regístrate</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  ¿Ya tienes cuenta? <span className="text-primary font-medium">Inicia sesión</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credenciales demo */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Cuentas demo</span>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => fillDemo('admin')} className="text-xs">
              Admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemo('mesero')} className="text-xs">
              Mesero
            </Button>
            <Button variant="outline" size="sm" onClick={() => fillDemo('barra')} className="text-xs">
              Barra
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70 text-center mt-2">
            admin@verveos.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
