// KioskUnlockView - Pantalla para abrir mesa en kiosk de tablet mediante PIN de staff
'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Delete, UtensilsCrossed, Loader2, ArrowLeft } from 'lucide-react'
import { api, setDeviceToken } from '@/lib/api'
import type { TableInfo } from '@/lib/types'

interface KioskUnlockViewProps {
  onBack: () => void
  onOpened: (table: { id: string; number: string; name: string | null; status: string }) => void
  tableNumber?: string // precargar si viene de la gestión de mesas
}

export function KioskUnlockView({ onBack, onOpened, tableNumber: initialTable }: KioskUnlockViewProps) {
  const [pin, setPin] = useState('')
  const [tableNumber, setTableNumber] = useState(initialTable ?? '')
  const [loading, setLoading] = useState(false)

  const pinFilled = pin.length === 4
  const tableFilled = tableNumber.trim().length > 0
  const canSubmit = pinFilled && tableFilled && !loading

  const pressDigit = (d: string) => {
    if (pin.length >= 4) return
    setPin((prev) => prev + d)
  }

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const clear = () => {
    setPin('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await api.openTable(pin, tableNumber.trim().toUpperCase())
      setDeviceToken(res.deviceToken)
      const table: TableInfo = res.table
      toast.success(`Mesa ${table.number} abierta`)
      onOpened({
        id: table.id,
        number: table.number,
        name: table.name,
        status: table.status,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo abrir la mesa'
      toast.error(msg)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-3 ring-1 ring-primary/30">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Verve<span className="text-primary">OS</span>
          </h1>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Volver"
                className="shrink-0 -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <CardTitle>Abrir mesa</CardTitle>
                <CardDescription>
                  Ingresa el PIN de staff y selecciona la mesa
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* PIN display */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                PIN de staff
              </span>
              <div className="flex items-center gap-3" aria-label={`PIN ${pin.length} de 4 dígitos`}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-full transition-colors ${
                      i < pin.length ? 'bg-primary' : 'bg-muted ring-1 ring-border'
                    }`}
                  >
                    ●
                  </span>
                ))}
              </div>
            </div>

            {/* Table number input */}
            <div className="space-y-2">
              <label htmlFor="tableNumber" className="text-xs uppercase tracking-wide text-muted-foreground">
                Mesa
              </label>
              <Input
                id="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value.toUpperCase())}
                placeholder="Ej: M5"
                className="h-12 text-center text-xl font-semibold uppercase tracking-widest"
                autoCapitalize="characters"
                autoCorrect="off"
                inputMode="text"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) handleSubmit()
                }}
              />
            </div>

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-2">
              {keys.map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant="secondary"
                  onClick={() => pressDigit(k)}
                  disabled={loading}
                  className="h-14 sm:h-16 text-2xl font-semibold bg-muted hover:bg-secondary border border-border/60"
                  aria-label={`Dígito ${k}`}
                >
                  {k}
                </Button>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={clear}
                disabled={loading || pin.length === 0}
                className="h-14 sm:h-16 text-2xl font-semibold bg-muted hover:bg-secondary border border-border/60"
                aria-label="Limpiar PIN"
              >
                C
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => pressDigit('0')}
                disabled={loading}
                className="h-14 sm:h-16 text-2xl font-semibold bg-muted hover:bg-secondary border border-border/60"
                aria-label="Dígito 0"
              >
                0
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={backspace}
                disabled={loading || pin.length === 0}
                className="h-14 sm:h-16 text-2xl font-semibold bg-muted hover:bg-secondary border border-border/60"
                aria-label="Borrar"
              >
                <Delete className="w-6 h-6" />
              </Button>
            </div>

            {/* Submit */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="lg"
              className="w-full gap-2 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abriendo mesa…
                </>
              ) : (
                'Abrir mesa'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
