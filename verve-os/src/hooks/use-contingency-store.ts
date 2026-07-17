// useContingencyStore - Almacena pedidos offline en localStorage
'use client'
import { useCallback, useEffect, useState } from 'react'
import type { OfflineOrder, CartItem } from '@/lib/types'

const STORAGE_KEY = 'verveos_offline_orders'

function readAll(): OfflineOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OfflineOrder[]) : []
  } catch {
    return []
  }
}

function writeAll(orders: OfflineOrder[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  // Dispara evento para que otros componentes se actualicen
  window.dispatchEvent(new Event('verveos:offline-orders'))
}

export function useContingencyStore() {
  const [orders, setOrders] = useState<OfflineOrder[]>(() => readAll())

  useEffect(() => {
    const onChange = () => setOrders(readAll())
    window.addEventListener('verveos:offline-orders', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('verveos:offline-orders', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const addOrder = useCallback(
    (order: { tableId: string; notes: string; items: CartItem[]; total: number }) => {
      const offline: OfflineOrder = {
        localId: `off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tableId: order.tableId,
        notes: order.notes,
        total: order.total,
        items: order.items,
        createdAt: new Date().toISOString(),
      }
      const all = readAll()
      all.push(offline)
      writeAll(all)
      return offline
    },
    []
  )

  const removeOrders = useCallback((localIds: string[]) => {
    const remaining = readAll().filter((o) => !localIds.includes(o.localId))
    writeAll(remaining)
  }, [])

  const clearAll = useCallback(() => {
    writeAll([])
  }, [])

  return { orders, addOrder, removeOrders, clearAll }
}
