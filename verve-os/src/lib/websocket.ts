import { io, Socket } from 'socket.io-client'

type Listener = (...args: unknown[]) => void

class WebSocketService {
  private socket: Socket | null = null
  private listeners = new Map<string, Set<Listener>>()
  private _connected = false
  private connectAttempts = 0

  get connected() {
    return this._connected
  }

  connect() {
    if (this.socket?.connected) return
    if (this.socket) {
      this.socket.connect()
      return
    }
    this.socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    })

    this.socket.on('connect', () => {
      this._connected = true
      this.connectAttempts = 0
      this.emitToListeners('$connected', true)
    })

    this.socket.on('disconnect', () => {
      this._connected = false
      this.emitToListeners('$connected', false)
    })

    this.socket.on('connect_error', () => {
      this._connected = false
    })

    this.socket.onAny((event: string, ...args: unknown[]) => {
      this.emitToListeners(event, ...args)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this._connected = false
    }
    this.listeners.clear()
  }

  join(room: string) {
    this.socket?.emit('join', room)
  }

  emit(event: string, ...args: unknown[]) {
    this.socket?.emit(event, ...args)
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.off(event, callback)
  }

  off(event: string, callback: Listener) {
    this.listeners.get(event)?.delete(callback)
  }

  private emitToListeners(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(...args) } catch { /* ignore */ }
    })
  }
}

export const wsService = new WebSocketService()
