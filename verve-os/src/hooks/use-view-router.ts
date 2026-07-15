// useViewRouter - Router de vistas en cliente (single page)
'use client'
import { useCallback, useEffect, useState } from 'react'
import type { View } from '@/lib/types'

const STORAGE_KEY = 'verveos_current_view'

function parseHash(): View {
  if (typeof window === 'undefined') return { name: 'login' }
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return { name: 'login' }
  const parts = hash.split('/').filter(Boolean)
  switch (parts[0]) {
    case 'select':
      return { name: 'select' }
    case 'kiosk':
      return parts[1] ? { name: 'kiosk', tableId: decodeURIComponent(parts[1]) } : { name: 'select' }
    case 'kiosk-unlock':
      return parts[1] ? { name: 'kiosk-unlock', tableId: decodeURIComponent(parts[1]) } : { name: 'select' }
    case 'tables':
      return { name: 'tables' }
    case 'command':
      return { name: 'command' }
    case 'users':
      return { name: 'users' }
    case 'categories':
      return { name: 'categories' }
    case 'dashboard':
      return { name: 'dashboard' }
    case 'station':
      return parts[1] ? { name: 'station', station: parts[1] === 'barra' ? 'barra' : 'cocina' } : { name: 'select' }
    case 'waiter':
      return { name: 'waiter' }
    case 'bill':
      return parts[1] ? { name: 'bill', tableId: decodeURIComponent(parts[1]) } : { name: 'tables' }
    case 'contingency':
      return { name: 'contingency' }
    default:
      return { name: 'login' }
  }
}

function viewToHash(view: View): string {
  switch (view.name) {
    case 'login':
      return ''
    case 'select':
      return '#/select'
    case 'kiosk':
      return `#/kiosk/${encodeURIComponent(view.tableId)}`
    case 'kiosk-unlock':
      return `#/kiosk-unlock/${encodeURIComponent(view.tableId)}`
    case 'tables':
      return '#/tables'
    case 'command':
      return '#/command'
    case 'users':
      return '#/users'
    case 'categories':
      return '#/categories'
    case 'dashboard':
      return '#/dashboard'
    case 'station':
      return `#/station/${view.station}`
    case 'waiter':
      return '#/waiter'
    case 'bill':
      return `#/bill/${encodeURIComponent(view.tableId)}`
    case 'contingency':
      return '#/contingency'
  }
}

export function useViewRouter() {
  const [view, setView] = useState<View>(() => {
    if (typeof window === 'undefined') return { name: 'login' }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as View
      } catch {
        return parseHash()
      }
    }
    return parseHash()
  })

  useEffect(() => {
    const onHashChange = () => setView(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: View) => {
    setView(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    const hash = viewToHash(next)
    if (hash) {
      window.location.hash = hash
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  return { view, navigate }
}
