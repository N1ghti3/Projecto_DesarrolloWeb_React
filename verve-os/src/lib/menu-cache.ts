// VerveOS - Caché del menú en localStorage para uso offline
import type { Product } from './types'

const MENU_CACHE_KEY = 'verveos_menu_cache'
const MENU_CACHE_TS_KEY = 'verveos_menu_cache_ts'

export function cacheMenu(products: Product[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(products))
    localStorage.setItem(MENU_CACHE_TS_KEY, String(Date.now()))
  } catch {
    // localStorage puede estar lleno; ignoramos
  }
}

export function getCachedMenu(): Product[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as Product[]
  } catch {
    return null
  }
}

export function getCachedMenuAge(): number | null {
  if (typeof window === 'undefined') return null
  const ts = localStorage.getItem(MENU_CACHE_TS_KEY)
  if (!ts) return null
  const age = Date.now() - Number(ts)
  return Number.isFinite(age) ? age : null
}
