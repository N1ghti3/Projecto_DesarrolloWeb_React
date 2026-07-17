import { useEffect, useRef, useState } from 'react'
import { wsService } from '@/lib/websocket'

interface UseWebSocketOptions {
  events?: Record<string, (...args: unknown[]) => void>
  onConnect?: () => void
  deps?: unknown[]
}

export function useWebSocket({ events, onConnect, deps }: UseWebSocketOptions = {}) {
  const [connected, setConnected] = useState(wsService.connected)
  const onConnectRef = useRef(onConnect)
  onConnectRef.current = onConnect

  useEffect(() => {
    wsService.connect()

    const unsubs: (() => void)[] = []
    if (events) {
      for (const [event, cb] of Object.entries(events)) {
        unsubs.push(wsService.on(event, cb))
      }
    }

    const unsubConnected = wsService.on('$connected', (val: unknown) => {
      setConnected(Boolean(val))
      if (val && onConnectRef.current) onConnectRef.current()
    })
    unsubs.push(unsubConnected)

    // If already connected, run onConnect immediately
    if (wsService.connected && onConnectRef.current) {
      onConnectRef.current()
    }

    return () => {
      unsubs.forEach((u) => u())
    }
  }, deps ?? []) // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, ws: wsService }
}
