// ErrorBoundary - Captura errores de render y muestra mensaje amigable
'use client'
import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[VerveOS] ErrorBoundary capturó:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground">
              Se produjo un error inesperado. Puedes intentar recargar la vista.
            </p>
            {this.state.message && (
              <pre className="text-xs text-left bg-muted/50 rounded-md p-3 overflow-auto max-h-32 scrollbar-verve">
                {this.state.message}
              </pre>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
