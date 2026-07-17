'use client'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatPrice } from './MenuItem'

interface KioskDialogsProps {
  confirmation: { count: number; total: number } | null
  onDismissConfirmation: () => void
  customerDialogOpen: boolean
  onCustomerDialogChange: (v: boolean) => void
  customerName: string
  onCustomerNameChange: (v: string) => void
  customerEmail: string
  onCustomerEmailChange: (v: string) => void
  onCustomerConfirm: () => void
  pinDialogOpen: boolean
  onPinDialogChange: (v: boolean) => void
  pin: string
  onPinChange: (v: string) => void
  onCloseTable: () => void
  closingTable: boolean
  tableId: string
}

export function KioskDialogs({
  confirmation, onDismissConfirmation,
  customerDialogOpen, onCustomerDialogChange,
  customerName, onCustomerNameChange, customerEmail, onCustomerEmailChange, onCustomerConfirm,
  pinDialogOpen, onPinDialogChange, pin, onPinChange, onCloseTable, closingTable, tableId,
}: KioskDialogsProps) {
  return (
    <>
      {/* Confirmación tras enviar */}
      <Dialog open={!!confirmation} onOpenChange={(o) => !o && onDismissConfirmation()}>
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
            <Button className="mt-6 w-full h-12 text-base" onClick={onDismissConfirmation}>
              Seguir pidiendo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Datos del cliente */}
      <Dialog open={customerDialogOpen} onOpenChange={(o) => !o && onCustomerDialogChange(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tus datos</DialogTitle>
            <DialogDescription>
              Ingresa tu nombre para el pedido (aparecerá en la facturación).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name-dialog">Nombre</Label>
              <Input
                id="customer-name-dialog"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Tu nombre"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email-dialog">Email (opcional)</Label>
              <Input
                id="customer-email-dialog"
                type="email"
                value={customerEmail}
                onChange={(e) => onCustomerEmailChange(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onCustomerDialogChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onCustomerConfirm} disabled={!customerName.trim()}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN para cerrar mesa */}
      <Dialog open={pinDialogOpen} onOpenChange={(o) => !o && onPinDialogChange(false)}>
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
              onChange={(e) => onPinChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCloseTable()
              }}
              placeholder="••••"
              className="tabular-nums tracking-widest text-center text-lg"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onPinDialogChange(false)}
              disabled={closingTable}
            >
              Cancelar
            </Button>
            <Button onClick={onCloseTable} disabled={closingTable || !pin.trim()} className="gap-2">
              {closingTable ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando…</>
              ) : (
                <><Lock className="w-4 h-4" /> Cerrar mesa</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
