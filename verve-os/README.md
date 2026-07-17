# VerveOS — POS para Gastro-Bar

Sistema POS pensado para gastro-bares. Permite gestionar pedidos, mesas, cocina, barra, usuarios y contingencia offline. Construido con Next.js 16, WebSocket en tiempo real, SQLite (Prisma) y arquitectura segura.

## Requisitos

- Node.js >= 22
- npm

## Configuración inicial

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Generar Prisma client y crear la BD
npx prisma generate
npx prisma db push

# Poblar la base de datos con datos de demostración
npx prisma db seed
```

## Ejecutar

Se necesitan dos terminales:

**Terminal 1 — WebSocket** (gestión de pedidos en tiempo real):
```bash
npx tsx mini-services/verveos-ws/index.ts
```

**Terminal 2 — Next.js**:
```bash
npm run dev
```

La aplicación arranca en `http://localhost:3000`.

## Credenciales de prueba

| Rol | Email | Contraseña | PIN |
|-----|-------|-----------|-----|
| Admin | admin@verveos.com | admin123 | 1234 |
| Mesero | mesero@verveos.com | mesero123 | 1111 |
| Bartender | barra@verveos.com | barra123 | 3333 |
| Cocina | cocina@verveos.com | cocina123 | 4444 |
| Cajero | cajero@verveos.com | cajero123 | 5555 |
| Supervisor | visor@verveos.com | visor123 | 6666 |
| Mesa (test) | mesa01@verveos.com a mesa12@verveos.com | mesa123 | — |

> Los PINs están hasheados con bcrypt (12 rounds) en el seed.

## Funcionalidades

- **Roles** — Admin, Mesero, Cocina, Barra, Cajero, Supervisor, Mesa (cada uno ve su interfaz)
- **Gestión de mesas** — Ocupar, liberar, combinar, ver cuenta, permisos por rol
- **Pedidos** — Crear con datos del cliente (nombre/email), agregar items, enviar a estación correspondiente (cocina/barra)
- **Estaciones** — Cocina y Barra reciben pedidos en tiempo real vía WebSocket
- **Facturación** — Split de cuenta, imprimir ticket térmico, marcar como pagado, muestra datos del cliente
- **Dashboard** — KPIs, ventas por día, top productos, por estación
- **Usuarios** — CRUD completo con roles y PIN (solo admin puede registrar)
- **Categorías** — CRUD con emoji y asignación a estación
- **Menú** — CRUD de productos con disponibilidad y búsqueda
- **Contingencia offline** — Modo sin conexión con cola de pedidos local
- **Llamadas a mesero** — Notificaciones en tiempo real
- **Kiosk mode** — Pantallas táctiles con autenticación por device token y cierre con PIN de staff
- **Rol Mesa** — Usuarios de prueba que solo ven el módulo "Mesas" y pueden acceder a mesas ocupadas como cliente

## Arquitectura

### Seguridad

- **JWT con rotación**: Access + Refresh tokens. Los secrets se generan con `crypto.randomBytes(32)` sin fallback a valores por defecto
- **PINs hasheados**: Almacenados con bcrypt (12 rounds), nunca expuestos en respuestas de API
- **Rate limiting**: Login (10 intentos/min), verificación de PIN (5 intentos/min) por IP
- **Error sanitization**: Los errores internos solo muestran `err.message` en desarrollo; en producción se ocultan
- **WebSocket protegido**: Los eventos `__emit` y `__broadcast` requieren un `x-internal-secret` compartido
- **Device tokens**: Generados con `crypto.randomBytes(32)`, permiten modo kiosko sin sesión persistente
- **Registro protegido**: Solo usuarios con rol admin pueden crear nuevas cuentas
- **Headers de seguridad**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

### Componentes

- **`useWebSocket`** — Hook singleton que mantiene una única conexión WebSocket compartida entre todas las vistas (TablesView, StationView, WaiterView, TableTopView)
- **`useCart`** — Hook de carrito con persistencia local, operaciones de agregar/quitar/incrementar/decrementar/limpiar
- **`MenuGrid`** — Grid de productos con búsqueda y filtro por categoría
- **`CategorySidebar`** — Sidebar de categorías para filtrar productos
- **`OrderStatusBar`** — Barra superior que muestra los pedidos activos de la mesa con estados
- **`CartSheet`** — Sheet lateral del carrito con resumen, notas, controles de cantidad y checkout
- **`KioskDialogs`** — Diálogos reutilizables: confirmación de pedido, datos del cliente, PIN de staff para cerrar mesa

### WebSocket

- Servicio independiente en `mini-services/verveos-ws/index.ts` (puerto 3003)
- Comunicación con Next.js mediante `WS_INTERNAL_SECRET` compartido
- Eventos: `table-orders`, `order:new`, `order:status`, `waiter:call`, `waiter:attend`, `request:table-orders`, `join:table`

### Refresh token rotation

- Cada vez que se refresca un token, se genera un nuevo refresh token y se invalida el anterior
- El cliente almacena tanto access como refresh token y los actualiza tras cada refresh

## Limitaciones actuales

- **Base de datos**: SQLite (no recomendado para producción con alta concurrencia. Migrar a PostgreSQL o Supabase)
- **Impresión de tickets**: Abre una ventana del navegador con formato térmico. No hay integración directa con impresoras Bluetooth/USB
- **Pagos electrónicos**: No integra pasarela de pago (Stripe, Mercado Pago, etc.). Solo registro de pago manual (efectivo/tarjeta/transferencia)
- **WebSocket**: Servicio separado que debe ejecutarse manualmente. Sin auto-arranque ni gestión de procesos (PM2, systemd)
- **Multi-tenant**: No soporta múltiples locales/vendedores
- **Internacionalización**: Solo español, sin soporte multi-idioma
- **Tests**: No hay suite de tests automatizados
- **Despliegue**: No hay configuración Docker ni scripts de deploy automatizado
- **Caché de menú**: Implementación básica en memoria, se pierde al reiniciar el servidor
- **Responsive**: Optimizado para tablets/kioskos. Algunas vistas no están adaptadas para móviles pequeños
