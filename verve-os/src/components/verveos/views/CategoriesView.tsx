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
  FolderTree,
  GripVertical,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { User, View, Category } from '@/lib/types'
import { AppHeader } from '../AppHeader'

interface CategoriesViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

export function CategoriesView({ user, online, navigate, onLogout }: CategoriesViewProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formEmoji, setFormEmoji] = useState('🍽️')
  const [formStation, setFormStation] = useState<'cocina' | 'barra'>('cocina')
  const [formSortOrder, setFormSortOrder] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.listCategories()
      setCategories(res.categories)
    } catch (err) {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormEmoji('🍽️')
    setFormStation('cocina')
    setFormSortOrder(categories.length)
    setDialogOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setFormName(c.name)
    setFormEmoji(c.emoji)
    setFormStation(c.station)
    setFormSortOrder(c.sortOrder)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (editing) {
        await api.updateCategory(editing.id, { name: formName.trim(), emoji: formEmoji.trim(), station: formStation, sortOrder: formSortOrder })
        toast.success('Categoría actualizada')
      } else {
        await api.createCategory({ name: formName.trim(), emoji: formEmoji.trim(), station: formStation, sortOrder: formSortOrder })
        toast.success('Categoría creada')
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error('Error al guardar', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Category) => {
    if (!confirm(`¿Eliminar categoría "${c.name}"?`)) return
    try {
      await api.deleteCategory(c.id)
      toast.success(`Categoría "${c.name}" eliminada`)
      load()
    } catch (err) {
      toast.error('Error al eliminar', { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Categorías"
        subtitle={`${categories.length} categoría(s)`}
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto">
        <Card className="p-5 mb-5 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Categorías disponibles para clasificar productos del menú
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva categoría
          </Button>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No hay categorías</p>
            <p className="text-sm">Crea categorías para organizar los productos del menú.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Estación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground text-xs">{c.sortOrder}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xl">{c.emoji}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.station === 'cocina' ? '🍳 Cocina' : '🍸 Barra'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Entradas" />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input value={formEmoji} onChange={(e) => setFormEmoji(e.target.value)} placeholder="🍽️" />
            </div>
            <div className="space-y-2">
              <Label>Estación</Label>
              <Select value={formStation} onValueChange={(v) => setFormStation(v as 'cocina' | 'barra')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cocina">🍳 Cocina</SelectItem>
                  <SelectItem value="barra">🍸 Barra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mt-auto border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FolderTree className="w-3 h-3" /> Las categorías se usan al crear productos
        </span>
      </footer>
    </div>
  )
}
