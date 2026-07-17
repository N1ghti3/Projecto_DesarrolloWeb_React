// BillView - Cuenta y cobro de una mesa.
// Muestra el detalle completo del consumo acumulado, IVA, propina y procesa el pago.
'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Loader2,
  Printer,
  ArrowLeft,
} from 'lucide-react'
import { api } from '@/lib/api'
import { AppHeader } from '../AppHeader'
import { formatPrice } from '../MenuItem'
import type { Bill, PaymentMethod, User, View } from '@/lib/types'

interface BillViewProps {
  user: User
  tableId: string
  online: boolean
  navigate: (view: View) => void
  onLogout: () => void
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: Smartphone },
]

const TIP_PRESETS = [0, 10, 15, 20]

// Mapeo de estados de item a etiqueta + color (paleta gastro-bar)
const ITEM_STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  en_preparacion: { label: 'En preparación', color: 'border-orange-700/40 bg-orange-700/15 text-orange-400' },
  listo: { label: 'Listo', color: 'border-lime-600/30 bg-lime-600/10 text-lime-400' },
  cancelado: { label: 'Cancelado', color: 'border-rose-800/40 bg-rose-800/15 text-rose-400' },
  entregado: { label: 'Entregado', color: 'border-muted-foreground/30 bg-muted/30 text-muted-foreground' },
}

function printTicket(tableId: string, summary: { subtotal: number; tax: number; tip: number; total: number; method: PaymentMethod; taxRate: number }, items: Bill['items']) {
  const now = new Date().toLocaleString('es-CO', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const lines = [
    '<html><head><meta charset="utf-8"><title>Ticket</title>',
    '<style>',
    '@page { margin: 0; size: 80mm auto; }',
    'body { font-family: "Courier New", monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 4mm 0; color: #000; }',
    '.center { text-align: center; }',
    '.header { font-size: 18px; font-weight: bold; margin-bottom: 2mm; }',
    '.subheader { font-size: 10px; color: #555; margin-bottom: 3mm; }',
    'hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }',
    'table { width: 100%; border-collapse: collapse; }',
    'td { padding: 0.5mm 0; vertical-align: top; }',
    'td.qty { width: 8mm; text-align: center; }',
    'td.name { }',
    'td.price { width: 20mm; text-align: right; }',
    '.total td { font-weight: bold; font-size: 14px; padding-top: 1mm; }',
    '.grand td { font-size: 16px; font-weight: bold; padding-top: 1mm; }',
    '.footer { margin-top: 3mm; font-size: 10px; color: #555; }',
    '</style></head><body>',
    '<div class="center header">VerveOS</div>',
    '<div class="center subheader">Gastro-Bar</div>',
    `<div class="center subheader">Mesa ${tableId} · ${now}</div>`,
    '<hr>',
    '<table>',
  ]

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  for (const it of items) {
    if (it.status === 'cancelado') continue
    const total = it.unitPrice * it.quantity
    lines.push(
      `<tr><td class="qty">${it.quantity}×</td><td class="name">${esc(it.productName)}</td><td class="price">$${(total / 1000).toFixed(1)}k</td></tr>`
    )
    if (it.notes) {
      lines.push(`<tr><td></td><td style="font-size:10px;color:#666;padding-left:8mm">${esc(it.notes)}</td><td></td></tr>`)
    }
  }

  lines.push('</table><hr>')
  lines.push(`<table><tr><td>Subtotal</td><td class="price">$${(summary.subtotal / 1000).toFixed(1)}k</td></tr>`)
  lines.push(`<tr><td>IVA (${summary.taxRate}%)</td><td class="price">$${(summary.tax / 1000).toFixed(1)}k</td></tr>`)
  lines.push(`<tr><td>Propina</td><td class="price">$${(summary.tip / 1000).toFixed(1)}k</td></tr>`)
  lines.push(`<tr class="grand"><td>TOTAL</td><td class="price">$${(summary.total / 1000).toFixed(1)}k</td></tr>`)
  lines.push(`</table><hr>`)
  lines.push(`<div class="center">Método: ${summary.method}</div>`)
  lines.push('<div class="center footer">¡Gracias por su visita!</div>')
  lines.push('</body></html>')

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(lines.join('\n'))
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
  }
}

export function BillView({ user, tableId, online, navigate, onLogout }: BillViewProps) {
  const isViewer = user.role === 'visor'
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipPercent, setTipPercent] = useState(10)
  const [customTip, setCustomTip] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [paying, setPaying] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [summary, setSummary] = useState<{ subtotal: number; tax: number; tip: number; total: number; method: PaymentMethod } | null>(null)

  const loadBill = useCallback(async () => {
    setLoading(true)
    try {
      const b = await api.getBill(tableId)
      setBill(b)
    } catch (err) {
      toast.error('No se pudo cargar la cuenta', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [tableId])

  useEffect(() => {
    loadBill()
  }, [loadBill])

  const subtotal = bill?.subtotal ?? 0
  const tax = bill?.tax ?? 0
  const taxRate = bill?.taxRate ?? 0

  // Si el usuario escribe una propina custom, se usa ese %; si no, los presets.
  const effectiveTipPercent = useMemo(() => {
    if (customTip.trim() !== '') {
      const n = Number(customTip)
      if (!Number.isNaN(n) && n >= 0) return n
    }
    return tipPercent
  }, [customTip, tipPercent])

  const tipAmount = Math.round((subtotal * effectiveTipPercent) / 100)
  const grandTotal = subtotal + tax + tipAmount

  const handlePresetTip = (pct: number) => {
    setTipPercent(pct)
    setCustomTip('')
  }

  const handlePay = async () => {
    if (!bill) return
    setPaying(true)
    try {
      await api.payBill(tableId, { tip: tipAmount, paymentMethod })
      setSummary({ subtotal, tax, tip: tipAmount, total: grandTotal, method: paymentMethod })
      setSuccessOpen(true)
      toast.success('Pago procesado', {
        description: `Mesa ${tableId} · ${formatPrice(grandTotal)} · ${paymentMethod}`,
      })
    } catch (err) {
      toast.error('No se pudo procesar el pago', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setPaying(false)
    }
  }

  // Agrupar items por orderId para mostrarlos ordenados
  const groupedItems = useMemo(() => {
    if (!bill) return []
    const map = new Map<string, typeof bill.items>()
    for (const it of bill.items) {
      const arr = map.get(it.orderId) ?? []
      arr.push(it)
      map.set(it.orderId, arr)
    }
    return Array.from(map.entries())
  }, [bill])

  const orderMetaById = useMemo(() => {
    const map = new Map<string, { status: string; createdAt: string; itemCount: number }>()
    if (bill) {
      for (const o of bill.orders) {
        map.set(o.id, { status: o.status, createdAt: o.createdAt, itemCount: o.itemCount })
      }
    }
    return map
  }, [bill])

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        online={online}
        title={`Cuenta · Mesa ${tableId}`}
        subtitle="Cobro de mesa"
        onBack={() => navigate({ name: 'select' })}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Botón volver discreto (móvil) */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground"
          onClick={() => navigate({ name: 'select' })}
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>

        {loading ? (
          <Card className="p-10 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm">Cargando cuenta…</p>
          </Card>
        ) : !bill || bill.items.length === 0 ? (
          <Card className="p-10 flex flex-col items-center justify-center text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No hay consumo en esta mesa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando la mesa tenga pedidos activos, la cuenta aparecerá aquí.
            </p>
            <Button
              variant="outline"
              className="mt-5 gap-1.5"
              onClick={() => navigate({ name: 'select' })}
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </Button>
          </Card>
        ) : (
          <>
            {/* Datos del cliente */}
            {(bill.customerName || bill.customerEmail) && (
              <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Cliente</span>
                </div>
                {bill.customerName && (
                  <p className="text-sm font-medium">{bill.customerName}</p>
                )}
                {bill.customerEmail && (
                  <p className="text-xs text-muted-foreground">{bill.customerEmail}</p>
                )}
              </Card>
            )}

            {/* Detalle de consumo */}
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Detalle de consumo</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {bill.items.length} artículo(s)
                </Badge>
              </div>

              <ScrollArea className="max-h-96 scrollbar-verve">
                <div className="px-5 py-3 space-y-4">
                  {groupedItems.map(([orderId, items]) => {
                    const meta = orderMetaById.get(orderId)
                    return (
                      <div key={orderId} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">
                            Pedido · {new Date(meta?.createdAt ?? Date.now()).toLocaleString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                          {meta && (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {meta.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <ul className="space-y-1.5">
                          {items.map((it) => {
                            const sm = ITEM_STATUS_META[it.status] ?? ITEM_STATUS_META.entregado
                            return (
                              <li
                                key={it.orderItemId}
                                className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0"
                              >
                                <div className="shrink-0 w-10 text-center">
                                  <span className="font-semibold tabular-nums">{it.quantity}×</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{it.productName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatPrice(it.unitPrice)} c/u
                                  </p>
                                  {it.notes && (
                                    <p className="text-xs text-amber-400/80 italic mt-0.5 line-clamp-2">
                                      “{it.notes}”
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className={`shrink-0 text-[10px] ${sm.color}`}>
                                  {sm.label}
                                </Badge>
                                <div className="shrink-0 w-20 text-right">
                                  <p className="text-sm font-semibold tabular-nums">
                                    {formatPrice(it.lineTotal)}
                                  </p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </Card>

            {/* Totales */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IVA ({taxRate}%)</span>
                <span className="font-medium tabular-nums">{formatPrice(tax)}</span>
              </div>

              {/* Propina */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Propina ({effectiveTipPercent}%)</Label>
                  <span className="font-medium tabular-nums text-primary">{formatPrice(tipAmount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {TIP_PRESETS.map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      size="sm"
                      variant={tipPercent === pct && customTip === '' ? 'default' : 'outline'}
                      className="h-8 px-3 tabular-nums"
                      onClick={() => handlePresetTip(pct)}
                    >
                      {pct}%
                    </Button>
                  ))}
                  <div className="relative w-24">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={customTip}
                      onChange={(e) => setCustomTip(e.target.value)}
                      placeholder="Otro"
                      className="h-8 pr-7 tabular-nums"
                      aria-label="Porcentaje personalizado de propina"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-end justify-between">
                <span className="text-sm text-muted-foreground">Total a pagar</span>
                <span className="text-3xl font-bold text-primary tabular-nums">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </Card>

            {/* Método de pago */}
            <Card className="p-5 space-y-3">
              <Label className="text-sm font-medium">Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon
                    return (
                      <SelectItem key={m.value} value={m.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          {m.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {isViewer ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center text-sm text-amber-400">
                  Modo solo lectura: un cajero o mesero debe procesar el pago.
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-12 text-base gap-2"
                  onClick={handlePay}
                  disabled={paying || grandTotal <= 0}
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Procesando…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Procesar pago · {formatPrice(grandTotal)}
                    </>
                  )}
                </Button>
              )}
            </Card>
          </>
        )}
      </main>

      {/* Diálogo de pago exitoso */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm text-center [&>button]:hidden">
          <div className="flex flex-col items-center py-2">
            <div className="w-20 h-20 rounded-full bg-lime-600/15 flex items-center justify-center mb-4 ring-4 ring-lime-600/10">
              <CheckCircle2 className="w-12 h-12 text-lime-400" />
            </div>
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-2xl">¡Pago exitoso!</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Mesa <span className="font-semibold text-foreground">{tableId}</span> cobrada correctamente.
              </DialogDescription>
            </DialogHeader>

            {summary && (
              <div className="w-full mt-4 rounded-lg border border-border/60 bg-muted/30 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatPrice(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span className="tabular-nums">{formatPrice(summary.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Propina</span>
                  <span className="tabular-nums">{formatPrice(summary.tip)}</span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between font-semibold text-primary">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(summary.total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Método</span>
                  <span className="capitalize">{summary.method}</span>
                </div>
              </div>
            )}

            <div className="w-full mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full h-11 gap-2"
                onClick={() => {
                  if (summary && bill) {
                    printTicket(tableId, { ...summary, taxRate: bill.taxRate }, bill.items)
                  }
                }}
              >
                <Printer className="w-4 h-4" /> Imprimir ticket
              </Button>
              <Button
                className="w-full h-11 gap-2"
                onClick={() => {
                  setSuccessOpen(false)
                  navigate({ name: 'tables' })
                }}
              >
                Volver a mesas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
