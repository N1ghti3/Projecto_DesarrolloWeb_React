// useNetworkStatus - Detecta conexión a internet en tiempo real
'use client'
import { useEffect, useState } from 'react'

export function useNetworkStatus() {
  const [online, setOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)

    const goOnline = () => {
      setOnline(true)
      setWasOffline(true)
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Ping ligero cada 20s para detectar falsos "online"
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/menu', { method: 'GET', cache: 'no-store' })
        if (!res.ok) throw new Error('bad')
        setOnline(true)
      } catch {
        setOnline(false)
      }
    }, 20000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [])

  return { online, wasOffline, clearWasOffline: () => setWasOffline(false) }
}
