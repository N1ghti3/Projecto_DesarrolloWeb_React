# VerveOS - POS para Gastro-Bar

Sistema POS pensado para gastro-bares. Permite gestionar pedidos, mesas, cocina, barra, usuarios y contingencia offline.

## Requisitos

- Node.js >= 18
- npm

## Configuración inicial

```bash
# Instalar dependencias
npm install

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

## Funcionalidades

- **Roles** — Admin, Mesero, Cocina, Barra, Cajero, Supervisor (cada uno ve su interfaz)
- **Gestión de mesas** — Ocupar, liberar, combinar, ver cuenta
- **Pedidos** — Crear, agregar items, enviar a estación correspondiente (cocina/barra)
- **Estaciones** — Cocina y Barra reciben pedidos en tiempo real vía WebSocket
- **Facturación** — Split de cuenta, imprimir ticket térmico, marcar como pagado
- **Dashboard** — KPIs, ventas por día, top productos, por estación
- **Usuarios** — CRUD completo con roles y PIN
- **Categorías** — CRUD con emoji y asignación a estación
- **Menú** — CRUD de productos con disponibilidad
- **Contingencia offline** — Modo sin conexión con cola de pedidos local
- **Llamadas a mesero** — Notificaciones en tiempo real

## Limitaciones actuales

- **Base de datos**: SQLite (no recomendado para producción con alta concurrencia. Migrar a PostgreSQL o Supabase)
- **Autenticación**: JWT simple sin refresh token rotation ni sesión persistente avanzada
- **Impresión de tickets**: Abre una ventana del navegador con formato térmico. No hay integración directa con impresoras Bluetooth/USB
- **Pagos electrónicos**: No integra pasarela de pago (Stripe, Mercado Pago, etc.). Solo registro de pago manual (efectivo/tarjeta/transferencia)
- **WebSocket**: Servicio separado que debe ejecutarse manualmente. Sin auto-arranque ni gestión de procesos (PM2, systemd)
- **Multi-tenant**: No soporta múltiples locales/vendedores
- **Internacionalización**: Solo español, sin soporte multi-idioma
- **Tests**: No hay suite de tests automatizados
- **Despliegue**: No hay configuración Docker ni scripts de deploy automatizado
- **Caché de menú**: Implementación básica en memoria, se pierde al reiniciar el servidor
- **Responsive**: Optimizado para tablets/kioskos. Algunas vistas no están adaptadas para móviles pequeños
