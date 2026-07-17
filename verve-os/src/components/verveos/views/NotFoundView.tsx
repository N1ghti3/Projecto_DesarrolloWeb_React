// NotFoundView - Página 404
'use client'
import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'

interface NotFoundViewProps {
  onHome: () => void
}

export function NotFoundView({ onHome }: NotFoundViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
        <Compass className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        La vista que buscas no existe o no está disponible. Quizá fue movida o eliminada.
      </p>
      <Button onClick={onHome} className="gap-2">
        Volver al inicio
      </Button>
    </div>
  )
}
