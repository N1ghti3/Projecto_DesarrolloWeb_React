// VerveOS - Servicio de API (fetch wrapper)
// Todas las peticiones usan rutas relativas (regla del gateway Caddy).
import type { AuthResponse, Product, Order, OfflineOrder, User, UserAdmin, TableInfo, Bill, WaiterCall, DashboardData, Category } from './types'

const TOKEN_KEY = 'verveos_access_token'
const REFRESH_KEY = 'verveos_refresh_token'
const USER_KEY = 'verveos_user'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.accessToken)
  localStorage.setItem(REFRESH_KEY, data.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

// Bandera y promesa para evitar múltiples refreshes simultáneos
let refreshPromise: Promise<string | null> | null = null

// Intercambia el refresh token por un nuevo access token.
// Devuelve el nuevo token o null si no se pudo refrescar.
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data.accessToken) return null
      setAccessToken(data.accessToken)
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      }
      return data.accessToken as string
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const DEVICE_TOKEN_KEY = 'verveos_device_token'

export function getDeviceToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEVICE_TOKEN_KEY)
}

export function setDeviceToken(token: string) {
  localStorage.setItem(DEVICE_TOKEN_KEY, token)
}

export function clearDeviceToken() {
  localStorage.removeItem(DEVICE_TOKEN_KEY)
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; useDevice?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true, useDevice = false } = options

  const doFetch = async (tokenOverride?: string | null): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth) {
      const token = tokenOverride ?? getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    if (useDevice) {
      const dt = getDeviceToken()
      if (dt) headers['x-device-token'] = dt
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    try {
      return await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  let res: Response
  try {
    res = await doFetch()
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Tiempo de espera agotado'
        : 'Sin conexión al servidor'
    const e = new Error(message) as Error & { status: number }
    e.status = 0
    throw e
  }

  // Si recibimos 401 y la petición llevaba auth, intentar refrescar el token
  // y reintentar una sola vez.
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      try {
        res = await doFetch(newToken)
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === 'AbortError'
            ? 'Tiempo de espera agotado'
            : 'Sin conexión al servidor'
        const e = new Error(message) as Error & { status: number }
        e.status = 0
        throw e
      }
    } else {
      // No se pudo refrescar: la sesión expiró. Notificar para hacer logout.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('verveos:auth-expired'))
      }
    }
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Error ${res.status}`
    const err = new Error(message) as Error & { status: number }
    err.status = res.status
    throw err
  }

  return data as T
}

// ----- Auth -----
export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  register: (data: { name: string; email: string; password: string; role?: string }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: data, auth: false }),

  // ----- Menu -----
  listMenu: () => request<{ products: Product[] }>('/api/menu'),

  createProduct: (data: Partial<Product>) =>
    request<{ product: Product }>('/api/menu', { method: 'POST', body: data }),

  updateProduct: (id: string, data: Partial<Product>) =>
    request<{ product: Product }>(`/api/menu/${id}`, { method: 'PUT', body: data }),

  deleteProduct: (id: string) =>
    request<{ deleted: string }>(`/api/menu/${id}`, { method: 'DELETE' }),

  // ----- Orders -----
  listActiveOrders: (station?: 'cocina' | 'barra') =>
    request<{ orders: Order[] }>(`/api/orders/active${station ? `?station=${station}` : ''}`),

  createOrder: (data: { tableId: string; notes?: string; items: Array<{ productId: string; quantity: number; notes?: string }> }, useDevice = false) =>
    request<{ order: Order }>('/api/orders', { method: 'POST', body: data, useDevice }),

  updateOrderStatus: (id: string, status: string) =>
    request<{ order: Order }>(`/api/orders/${id}/status`, { method: 'PATCH', body: { status } }),

  updateItemStatus: (orderId: string, itemId: string, status: string) =>
    request<{ itemId: string; status: string; orderId: string }>(`/api/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body: { status } }),

  cancelOrder: (id: string) =>
    request<{ id: string; status: string }>(`/api/orders/${id}/cancel`, { method: 'POST' }),

  syncContingency: (orders: OfflineOrder[]) =>
    request<{ synced: string[]; count: number; errors?: Array<{ localId: string; reason: string }> }>('/api/orders/contingency', { method: 'POST', body: { orders } }),

  // ----- Device sessions / kiosk -----
  openTable: (pin: string, tableNumber: string) =>
    request<{ deviceToken: string; sessionId: string; table: TableInfo; openedBy: { id: string; name: string; role: string } }>(
      '/api/device/open-table', { method: 'POST', body: { pin, tableNumber }, auth: false }
    ),

  closeTable: (tableNumber: string, pin?: string) =>
    request<{ table: TableInfo }>('/api/device/close-table', { method: 'POST', body: { tableNumber, pin } }),

  // ----- Tables -----
  listTables: () => request<{ tables: TableInfo[] }>('/api/tables'),

  // ----- Bill (cuenta por mesa) -----
  getBill: (tableId: string) => request<{ bill: Bill }>(`/api/tables/${tableId}/bill`).then((r) => r.bill),
  payBill: (tableId: string, data: { tip?: number; paymentMethod?: string }) =>
    request<{ table: TableInfo; payment: Record<string, unknown> }>(`/api/tables/${tableId}/bill`, { method: 'POST', body: data }),

  // ----- Waiter calls -----
  listWaiterCalls: () => request<{ calls: WaiterCall[] }>('/api/waiter-calls'),
  callWaiter: (data: { tableId?: string; tableNumber?: string; reason?: string }, useDevice = false) =>
    request<{ call: WaiterCall }>('/api/waiter-calls', { method: 'POST', body: data, useDevice }),
  attendCall: (id: string) =>
    request<{ call: WaiterCall }>(`/api/waiter-calls/${id}/attend`, { method: 'POST' }),

  // ----- Menu availability (86) -----
  setProductAvailability: (id: string, available: boolean) =>
    request<{ product: { id: string; name: string; available: boolean; stock: number } }>(`/api/menu/${id}/availability`, { method: 'PATCH', body: { available } }),

  // ----- Categories -----
  listCategories: () => request<{ categories: Category[] }>('/api/categories'),
  createCategory: (data: { name: string; emoji?: string; station?: string; sortOrder?: number }) =>
    request<{ category: Category }>('/api/categories', { method: 'POST', body: data }),
  updateCategory: (id: string, data: { name?: string; emoji?: string; station?: string; sortOrder?: number }) =>
    request<{ category: Category }>(`/api/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id: string) =>
    request<{ deleted: string }>(`/api/categories/${id}`, { method: 'DELETE' }),

  // ----- Dashboard -----
  getDashboard: () => request<DashboardData>('/api/dashboard'),

  // ----- Settings -----
  getSettings: () => request<{ taxRate: number; taxName: string; venueName: string }>('/api/settings'),

  // ----- Users (admin) -----
  listUsers: () => request<{ users: UserAdmin[] }>('/api/users'),

  createUser: (data: { name: string; email: string; password: string; role?: string; pin?: string }) =>
    request<{ user: UserAdmin }>('/api/users', { method: 'POST', body: data }),

  updateUser: (id: string, data: { name?: string; email?: string; password?: string; role?: string; pin?: string; active?: boolean }) =>
    request<{ user: UserAdmin }>(`/api/users/${id}`, { method: 'PUT', body: data }),

  deleteUser: (id: string) =>
    request<{ deleted: string }>(`/api/users/${id}`, { method: 'DELETE' }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; user: User }>('/api/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),
}
