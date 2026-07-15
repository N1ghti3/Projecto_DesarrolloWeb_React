// VerveOS - Tipos compartidos del frontend
export type Role = 'admin' | 'mesero' | 'barra' | 'cocina' | 'cajero' | 'visor'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  pin?: string | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface Category {
  id: string
  name: string
  emoji: string
  station: 'cocina' | 'barra'
  sortOrder: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  station: 'cocina' | 'barra'
  stock: number
  imageUrl?: string | null
  available: boolean
  createdAt?: string
  updatedAt?: string
}

export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado' | 'pagado'
export type ItemStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'cancelado'
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia'
export type TableStatus = 'libre' | 'ocupada' | 'cobrada'

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  notes: string
  status: ItemStatus
  station: 'cocina' | 'barra'
}

export interface Order {
  id: string
  tableId: string
  tableNumber?: string
  status: OrderStatus
  total: number
  tax?: number
  tip?: number
  paymentMethod?: PaymentMethod | null
  paidAt?: string | null
  notes: string
  source: 'online' | 'contingencia'
  createdAt: string
  items: OrderItem[]
}

export interface TableInfo {
  id: string
  number: string
  name: string | null
  status: TableStatus
  capacity: number
  activeOrders?: number
  openTotal?: number
}

export interface DeviceSession {
  deviceToken: string
  sessionId: string
  table: TableInfo
  openedBy: { id: string; name: string; role: string }
}

export interface WaiterCall {
  id: string
  tableId: string
  tableNumber: string | null
  reason: 'mesero' | 'cuenta' | 'ayuda'
  status: 'pendiente' | 'atendido'
  createdAt: string
  attendedAt?: string | null
}

export interface Settings {
  taxRate: number
  taxName: string
  venueName: string
}

export interface Bill {
  table: TableInfo
  orders: Array<{ id: string; status: string; total: number; tax: number; itemCount: number; createdAt: string }>
  items: Array<{
    orderId: string
    orderItemId: string
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    notes: string
    status: string
    createdAt: string
  }>
  subtotal: number
  taxRate: number
  tax: number
  total: number
  grandTotal: number
}

// Item del carrito (cliente)
export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

// Orden offline guardada en localStorage
export interface OfflineOrder {
  localId: string
  tableId: string
  notes: string
  total: number
  items: CartItem[]
  createdAt: string
}

export interface DashboardData {
  today: { orders: number; revenue: number; tax: number; paidOrders: number }
  ordersByStatus: Record<string, number>
  salesByPayment: Record<string, number>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  tables: { active: number; free: number; total: number }
}

export interface UserAdmin extends User {
  active: boolean
  createdAt: string
  updatedAt?: string
}

export type View =
  | { name: 'login' }
  | { name: 'select' }
  | { name: 'kiosk'; tableId: string }
  | { name: 'kiosk-unlock'; tableId: string }
  | { name: 'tables' }
  | { name: 'command' }
  | { name: 'users' }
  | { name: 'categories' }
  | { name: 'dashboard' }
  | { name: 'station'; station: 'cocina' | 'barra' }
  | { name: 'waiter' }
  | { name: 'contingency' }
  | { name: 'bill'; tableId: string }
