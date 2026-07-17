// CommandView - Administración CRUD de productos (solo admin)
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Package, ShieldAlert } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Product, User, View, Category } from '@/lib/types'
import { formatPrice } from '../MenuItem'
import { AppHeader } from '../AppHeader'
import { ConfirmModal } from '../ConfirmModal'

interface CommandViewProps {
  user: User
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

const EMPTY_FORM: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  category: 'General',
  stock: 0,
  available: true,
}

export function CommandView({ user, online, navigate, onLogout }: CommandViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const isAdmin = user.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [menuRes, catRes] = await Promise.all([api.listMenu(), api.listCategories()])
      setProducts(menuRes.products)
      setCategories(catRes.categories)
    } catch (err) {
      toast.error('Error al cargar productos', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ ...p })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim() || form.price == null) {
      toast.error('Nombre y precio son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() ?? '',
        price: Number(form.price),
        category: form.category?.trim() || 'General',
        stock: Number(form.stock ?? 0),
        available: form.available ?? true,
        imageUrl: form.imageUrl ?? null,
      }
      if (editing) {
        const res = await api.updateProduct(editing.id, payload)
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? res.product : p)))
        toast.success(`Producto "${res.product.name}" actualizado`)
      } else {
        const res = await api.createProduct(payload)
        setProducts((prev) => [res.product, ...prev])
        toast.success(`Producto "${res.product.name}" creado`)
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error('No se pudo guardar', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.deleteProduct(deleteTarget.id)
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success(`Producto "${deleteTarget.name}" eliminado`)
    } catch (err) {
      toast.error('No se pudo eliminar', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader
          user={user}
          online={online}
          title="Administración"
          onBack={() => navigate({ name: 'select' })}
          onLogout={onLogout}
        />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
            <p className="text-muted-foreground">
              Solo los administradores pueden gestionar el menú. Tu rol actual es{' '}
              <span className="text-foreground font-medium">{user.role}</span>.
            </p>
            <Button className="mt-4" onClick={() => navigate({ name: 'select' })}>
              Volver al inicio
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title="Administración"
        subtitle={`${products.length} productos en el menú`}
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o categoría..."
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo producto
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="overflow-x-auto scrollbar-verve">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Producto</TableHead>
                    <TableHead className="min-w-[120px]">Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-center">Disponible</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No hay productos que coincidan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {p.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(p.price)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={p.stock <= 5 ? 'text-amber-400 font-medium' : ''}>{p.stock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.available && p.stock > 0 ? (
                            <Badge variant="outline" className="border-lime-600/30 bg-lime-600/10 text-lime-400">
                              Sí
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(p)}
                              aria-label={`Editar ${p.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                              aria-label={`Eliminar ${p.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/60 py-3 px-4 text-center text-xs text-muted-foreground">
        Gestión de menú · Panel de administración
      </footer>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-verve">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los datos del producto y guarda los cambios.'
                : 'Completa los datos del nuevo producto del menú.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nombre *</Label>
              <Input
                id="p-name"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Tacos al Pastor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea
                id="p-desc"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción breve del producto"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-price">Precio (COP) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  min={0}
                  value={form.price ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  value={form.stock ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cat">Categoría</Label>
              <Select
                value={form.category ?? ''}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="p-cat">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <Label htmlFor="p-avail" className="cursor-pointer">
                  Disponible para venta
                </Label>
                <p className="text-xs text-muted-foreground">Si está apagado, no aparecerá en el menú de mesa</p>
              </div>
              <Switch
                id="p-avail"
                checked={form.available ?? true}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, available: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Eliminar producto"
        description={
          deleteTarget
            ? `¿Seguro que deseas eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
