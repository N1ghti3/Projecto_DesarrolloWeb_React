// VerveOS - Página principal (única ruta visible: /)
// Router de vistas en cliente.
'use client'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useViewRouter } from '@/hooks/use-view-router'
import { ErrorBoundary } from '@/components/verveos/ErrorBoundary'
import { LoginView } from '@/components/verveos/views/LoginView'
import { SelectView } from '@/components/verveos/views/SelectView'
import { KioskUnlockView } from '@/components/verveos/views/KioskUnlockView'
import { getDeviceToken } from '@/lib/api'
import { TableTopView } from '@/components/verveos/views/TableTopView'
import { TablesView } from '@/components/verveos/views/TablesView'
import { CommandView } from '@/components/verveos/views/CommandView'
import { UsersView } from '@/components/verveos/views/UsersView'
import { CategoriesView } from '@/components/verveos/views/CategoriesView'
import { DashboardView } from '@/components/verveos/views/DashboardView'
import { StationView } from '@/components/verveos/views/StationView'
import { WaiterView } from '@/components/verveos/views/WaiterView'
import { BillView } from '@/components/verveos/views/BillView'
import { ContingencyView } from '@/components/verveos/views/ContingencyView'
import { NotFoundView } from '@/components/verveos/views/NotFoundView'
import { Loader2 } from 'lucide-react'

function Router() {
  const { user, loading, logout } = useAuth()
  const { online } = useNetworkStatus()
  const { view, navigate } = useViewRouter()

  useEffect(() => {
    if (!loading && !user && view.name !== 'login' && view.name !== 'kiosk') {
      navigate({ name: 'login' })
    }
    if (!loading && user && view.name === 'login') {
      navigate({ name: 'select' })
    }
  }, [loading, user, view.name, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  // Vista kiosk-unlock: SIEMPRE muestra el PIN pad (para "Abrir mesa" desde gestión)
  if (view.name === 'kiosk-unlock' && view.tableId) {
    return (
      <KioskUnlockView
        tableNumber={view.tableId}
        onBack={() => navigate(user ? { name: 'tables' } : { name: 'login' })}
        onOpened={() => navigate({ name: 'kiosk', tableId: view.tableId })}
      />
    )
  }

  // Vista kiosk: muestra la tablet del cliente.
  // Si hay device token → modo cliente. Si hay user logueado → modo preview de staff.
  // Si no hay ninguno → redirigir a kiosk-unlock.
  if (view.name === 'kiosk' && view.tableId) {
    const deviceToken = getDeviceToken()
    if (!deviceToken && !user) {
      return (
        <KioskUnlockView
          tableNumber={view.tableId}
          onBack={() => navigate({ name: 'login' })}
          onOpened={() => navigate({ name: 'kiosk', tableId: view.tableId })}
        />
      )
    }
    const kioskUser = user ?? {
      id: 'kiosk',
      name: 'Cliente',
      email: '',
      role: 'mesero' as const,
    }
    return (
      <TableTopView
        user={kioskUser}
        tableId={view.tableId}
        online={online}
        navigate={navigate}
        onLogout={logout}
      />
    )
  }

  // Si no hay usuario y no estamos en kiosk, mostrar login
  if (!user) {
    return <LoginView />
  }

  switch (view.name) {
    case 'login':
      return <LoginView />
    case 'select':
      return <SelectView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'tables':
      return <TablesView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'command':
      return <CommandView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'users':
      return <UsersView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'categories':
      return <CategoriesView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'dashboard':
      return <DashboardView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'station':
      return (
        <StationView
          user={user}
          station={view.station}
          online={online}
          navigate={navigate}
          onLogout={logout}
        />
      )
    case 'waiter':
      return <WaiterView user={user} online={online} navigate={navigate} onLogout={logout} />
    case 'bill':
      return <BillView user={user} tableId={view.tableId} online={online} navigate={navigate} onLogout={logout} />
    case 'contingency':
      return <ContingencyView user={user} online={online} navigate={navigate} onLogout={logout} />
    default:
      return <NotFoundView onHome={() => navigate({ name: 'select' })} />
  }
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ErrorBoundary>
  )
}
