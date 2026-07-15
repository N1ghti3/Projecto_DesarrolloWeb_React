'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  UserCog,
  Search,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { User, UserAdmin, View } from '@/lib/types'
import { AppHeader } from '../AppHeader'

interface UsersViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  mesero: 'Mesero',
  barra: 'Bartender',
  cocina: 'Cocina',
  cajero: 'Cajero',
  visor: 'Visor',
}

const ROLE_ICONS: Record<string, string> = {
  admin: '🔑',
  mesero: '🛎️',
  barra: '🍸',
  cocina: '🍳',
  cajero: '💰',
  visor: '👁️',
}

export function UsersView({ user, online, navigate, onLogout }: UsersViewProps) {
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAdmin | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('mesero')
  const [formPin, setFormPin] = useState('')
  const [formActive, setFormActive] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.listUsers()
      setUsers(res.users)
    } catch (err) {
      toast.error('No se pudieron cargar los usuarios', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const openCreate = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('mesero')
    setFormPin('')
    setFormActive(true)
    setDialogOpen(true)
  }

  const openEdit = (u: UserAdmin) => {
    setEditingUser(u)
    setFormName(u.name)
    setFormEmail(u.email)
    setFormPassword('')
    setFormRole(u.role)
    setFormPin(u.pin ?? '')
    setFormActive(u.active)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    if (!editingUser && !formPassword.trim()) {
      toast.error('La contraseña es obligatoria para nuevos usuarios')
      return
    }
    setSaving(true)
    try {
      if (editingUser) {
        const data: Record<string, unknown> = { name: formName.trim(), email: formEmail.trim(), role: formRole, pin: formPin, active: formActive }
        if (formPassword.trim()) data.password = formPassword
        await api.updateUser(editingUser.id, data as any)
        toast.success('Usuario actualizado')
      } else {
        await api.createUser({ name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole, pin: formPin })
        toast.success('Usuario creado')
      }
      setDialogOpen(false)
      loadUsers()
    } catch (err) {
      toast.error('Error al guardar usuario', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: UserAdmin) => {
    if (!confirm(`¿Desactivar usuario "${u.name}"?`)) return
    try {
      await api.deleteUser(u.id)
      toast.success(`Usuario "${u.name}" desactivado`)
      loadUsers()
    } catch (err) {
      toast.error('Error al desactivar usuario', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q)
  })

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Usuarios"
        subtitle={`${users.length} empleado(s)`}
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
        <Card className="p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo usuario
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <UserCog className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">
              {search ? 'Sin resultados' : 'No hay usuarios'}
            </p>
            <p className="text-sm">
              {search ? 'Prueba con otros términos de búsqueda' : 'Crea el primer usuario para empezar.'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={!u.active ? 'opacity-60' : ''}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <span>{ROLE_ICONS[u.role] ?? '👤'}</span>
                      {u.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.pin ?? '—'}</TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge variant="outline" className="text-xs border-lime-600/30 text-lime-400">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-rose-600/30 text-rose-400">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(u)}
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {u.id !== user.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(u)}
                            aria-label="Desactivar"
                            disabled={u.role === 'admin' && users.filter((x) => x.role === 'admin' && x.active).length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del empleado" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}</Label>
              <Input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Contraseña" type="password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PIN (4 dígitos)</Label>
                <Input value={formPin} onChange={(e) => setFormPin(e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} className="font-mono" />
              </div>
            </div>
            {editingUser && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="active-toggle" className="text-sm">Usuario activo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mt-auto border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Solo administradores
        </span>
      </footer>
    </div>
  )
}
