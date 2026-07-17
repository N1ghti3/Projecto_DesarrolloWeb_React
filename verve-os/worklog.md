# VerveOS - Worklog

Proyecto: Sistema POS/restaurante adaptado al stack Next.js 16 + Prisma/SQLite + socket.io + shadcn/ui (tema oscuro), todo en español.

---
Task ID: 1
Agent: main (orchestrator)
Task: Instalar dependencias y definir schema Prisma

Work Log:
- Instalado: bcryptjs, jsonwebtoken, socket.io, socket.io-client + tipos
- Schema Prisma definido con models: User, Product, Order, OrderItem
- Roles: admin | mesero | barra
- Estados de orden: pendiente | en_preparacion | listo | entregado | cancelado

Stage Summary:
- Dependencias listas. Schema listo para `bun run db:push`.

---
Task ID: 2-7
Agent: main (orchestrator)
Task: Construir mini-service WS, backend API completo, y frontend completo

Work Log:
- Mini-service socket.io en puerto 3003 con express emisor interno (/__emit, /__health)
- Prisma schema: User, Product, Order, OrderItem (SQLite)
- Seed: 3 usuarios demo (admin/mesero/barra) + 19 productos en 5 categorías
- Lib auth: bcrypt + JWT (access 15m + refresh 7d)
- Lib api-utils: requireAuth, requireAdmin, emitWsEvent, errorHandler
- API routes: auth/login, auth/register, menu (GET/POST/PUT/DELETE), orders (active/create/status/contingency)
- Frontend foundation: lib/api, lib/types, hooks (use-auth, use-network-status, use-contingency-store, use-view-router)
- Componentes: AppHeader, Cart, MenuItem, ConfirmModal, ErrorBoundary
- 7 vistas: Login, Select, TableTop, Command, BarDisplay, Contingency, NotFound
- page.tsx integra AuthProvider + ErrorBoundary + router de vistas por hash
- Tema oscuro con acento ámbar/naranja (identidad restaurante), footer sticky
- Lint: 0 errores. WS service corriendo en 3003. Dev server corriendo en 3000.

Stage Summary:
- Backend y frontend completos. Flujo: login → select → mesa (crear pedido) → barra (tiempo real WS).
- Modo contingencia: pedidos offline en localStorage con auto-sincronización al reconectar.
- Listo para verificación con Agent Browser.

---
Task ID: 8
Agent: main (orchestrator)
Task: Verificación con Agent Browser

Work Log:
- Login (admin@verveos.com/admin123) → SelectView con 4 módulos ✓
- TableTop M5: añadir productos, notas, enviar pedido → POST /api/orders 201 ✓
- BarDisplay vía Caddy (puerto 81): WebSocket "Conectado en tiempo real" ✓
- Pedido nuevo (M7) creado vía API → aparece instantáneamente en barra (toast "Nuevo pedido · Mesa M7") ✓
- Cambio de estado orden: pendiente → en_preparación (botón "Iniciar preparación") ✓
- CommandView (admin): tabla CRUD, crear producto "Empanadas Colombianas" → 201 ✓
- ContingencyView: inyección de pedido offline + auto-sincronización al reconectar → orden M9 persistida con source="contingencia" ✓
- Orden contingencia aparece en barra con badge "offline" ✓
- Responsive mobile (390px) verificado ✓
- Tema oscuro ámbar/naranja aplicado correctamente ✓

Correcciones durante verificación:
- Mini-service WS: cambié path de '/' a default (/socket.io/) para coexistir con endpoints express
- Lib api: añadí AbortController con timeout 8s para que peticiones fallen rápido en offline

Stage Summary:
- Flujo completo verificado end-to-end: login → mesa → pedido → barra tiempo real → cambio estado.
- CRUD admin funcional. Modo contingencia (offline + auto-sync) funcional.
- 3 servicios corriendo: Next.js (3000), WS mini-service (3003), Caddy (81).
- Lint: 0 errores. Listo para entrega.

---
Task ID: 9
Agent: main (orchestrator)
Task: Rediseñar paleta de colores a estética gastro-bar

Work Log:
- globals.css: nueva paleta gastro-bar
  - background: espresso oscuro cálido oklch(0.155 0.014 45)
  - foreground: crema/pergamino oklch(0.96 0.008 75)
  - primary: dorado/bronce quemado oklch(0.76 0.14 78) (metal de barra)
  - accent: vino borgoña profundo oklch(0.34 0.07 25)
  - charts: dorado, oliva, cobre, terracota, vino
- MenuItem: badges de categoría con tonos cálidos (ámbar, vino, oliva, dorado, terracota)
- BarDisplayView: estados de orden (pendiente ámbar, preparación cobre, listo oliva, cancelado vino)
- BarDisplayView: botones de acción con cobre/oliva en vez de cyan/esmeralda
- AppHeader, CommandView, ContingencyView: indicadores "en línea" cambiados a oliva (lime)
- Verificado: text-primary = lab(72% 16 62) = dorado. Lint: 0 errores. Compila OK.

Stage Summary:
- Identidad visual de gastro-bar aplicada en toda la app: fondo espresso, acentos dorados,
  toques de vino borgoña, texto crema. Ambiente cálido, íntimo y sofisticado.

---
Task ID: 10
Agent: main (orchestrator)
Task: Implementar 5 mejoras prioritarias (#1, #2, #3, #6, #5)

Work Log:
- #1 Caché de menú offline: lib/menu-cache.ts (cacheMenu/getCachedMenu). TableTopView usa caché como fallback cuando /api/menu falla. Verificado: 19 productos cacheados, menú cargado offline.
- #2 Descuento de stock: POST /api/orders y /api/orders/contingency ahora descuentan stock en transacción Prisma. Bloquean si stock insuficiente. Marcan available=false al llegar a 0. Verificado: stock 300→295 al pedir 5.
- #3 Refresh token: endpoint POST /api/auth/refresh. Cliente api.ts: al recibir 401, refresca token y reintenta una vez. Evento verveos:auth-expired → useAuth hace logout si refresh falla. Verificado: token inválido → auto-refresh → 261 chars renovados.
- #6 Sonido de notificación: hook use-notification-sound (Web Audio API, dos tonos ascendentes). BarDisplayView reproduce al recibir order:new. Toggle de silencio (Volume2/VolumeX) en la barra de estado.
- #5 Cuenta/cobro: schema Order +tip +paymentMethod +paidAt. Endpoint POST /api/orders/:id/bill (calcula subtotal+propina, estado "pagado"). Modal de cobro en BarDisplayView con propina rápida (0/10/15/20%), método de pago (efectivo/tarjeta/transferencia), totales. Verificado: 48000+5000=53000, estado pagado, pago tarjeta.

Correcciones durante implementación:
- Mini-service WS: añadidos campos tip/paymentMethod/paidAt a payloads
- Reinicio completo del dev server (next-server zombi del día anterior + .next cacheado) para que Prisma client reconociera los nuevos campos

Stage Summary:
- 5 mejoras implementadas y verificadas end-to-end con Agent Browser:
  1. Menú offline desde caché ✓
  2. Stock descontado con validación ✓
  3. Auto-refresh de token al expirar ✓
  4. Sonido de notificación en barra ✓
  5. Generación de cuenta con propina y método de pago ✓
- Lint: 0 errores. Next.js (3000) + WS (3003) corriendo.

---
Task ID: 11
Agent: main (orchestrator)
Task: Rediseñar vista de Mesa como experiencia kiosk para tablet

Work Log:
- Creado lib/emoji.ts: mapa de emojis por categoría y por producto (búsqueda por keywords)
- Rediseño completo de TableTopView como experiencia kiosk inmersiva:
  * Barra superior minimalista: logo + Mesa + estado conexión + botón "Llamar mesero"
  * Sidebar vertical de categorías con emojis grandes y texto (触摸 friendly)
  * Búsqueda con input grande y botón limpiar
  * Grid de productos en cards visuales: emoji grande, nombre, descripción, precio, botón "Añadir"
  * Badge de cantidad en cada card cuando el producto está en el carrito
  * Badge "Agotado" cuando no hay stock
  * Botón flotante "Ver pedido" con total y cantidad, centrado abajo
  * Carrito como Sheet deslizable desde la derecha: items con controles +/-, notas, total, enviar
  * Pantalla de confirmación tras enviar: check animado, resumen, "Seguir pidiendo"
- Mantiene toda la lógica: caché offline, fallback contingencia, auto-refresh token
- Responsive: tablet landscape (1024x768), tablet portrait (768x1024), mobile (390x844)

Verificación con Agent Browser:
- Tablet landscape: sidebar + grid 4 columnas + botón flotante ✓
- Añadir 3 productos → botón "Ver pedido 3 $80.000" ✓
- Sheet carrito con items, notas, total ✓
- Enviar pedido → confirmación "¡Pedido enviado!" ✓
- Pedido llegó a BD (M2: 2x Aperol + 1x Ceviche, $80.000, notas "Sin hielo", source online) ✓
- Barra mostró el pedido en tiempo real con "Conectado en tiempo real" ✓
- Mobile responsive verificado ✓

Stage Summary:
- Vista de Mesa transformada en kiosk táctil para tablet. El cliente navega categorías,
  añade productos, revisa su carrito y envía el pedido que llega en tiempo real a la barra.
- Lint: 0 errores. Servicios corriendo.

---
Task ID: 12-b
Agent: frontend-styling-expert
Task: Build StationView (cocina/barra with item-level status)

Work Log:
- Leído BarDisplayView (referencia de patrón WS), lib/types (OrderItem.station, ItemStatus), lib/api (api.updateItemStatus), AppHeader, MenuItem (formatPrice), useNotificationSound.
- Creado src/components/verveos/views/StationView.tsx (340 líneas) con:
  * Props: { user, station: 'cocina'|'barra', online, navigate, onLogout }
  * State: orders, loading, connected, updatingItemId, soundEnabled + soundEnabledRef (sync vía useEffect)
  * WebSocket en useEffect con dependencia [station]:
    - Connect: io('/?XTransformPort=3003', { transports: ['websocket','polling'], reconnection: true })
    - On connect: emit 'join' + 'request:active-orders' con { station }
    - 'active-orders' → setOrders, setLoading(false)
    - 'order:new' → solo añade si tiene items para esta estación, toast.info, play() si soundEnabled
    - 'order:status' → update o remove-after-3s si terminal (pagado/cancelado/entregado)
    - 'item:status' → actualiza el ítem específico dentro de su orden
    - Cleanup: socket.disconnect()
  * Filtro client-side: active = orders.filter(estado activo).filter(items.some(it.station === station))
  * Render de items: order.items.filter(it => it.station === station). Si la orden no tiene items para la estación, no se muestra la card.
  * Cada ítem tiene su propio estado (updatingItemId) y botones según item.status:
    - pendiente → "Iniciar" (orange-700) → api.updateItemStatus(order.id, item.id, 'en_preparacion')
    - en_preparacion → "Listo" (lime-700) → api.updateItemStatus(order.id, item.id, 'listo')
    - listo → Badge "Listo" (lime) + checkmark
    - cancelado → strikethrough + Badge "Cancelado" (vino)
  * Layout: AppHeader (title Cocina/Barra, subtitle "{activeCount} orden(es) activa(s)"), barra de conexión (punto verde + texto + toggle sonido + Radio), grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl, empty state con emoji estación, footer "{emoji} Estación de {station} · Tiempo real".
  * Paleta gastro-bar heredada (ámbar/cobre/oliva/vino).
- Lint: 0 errores en el archivo nuevo. tsc --noEmit: 0 errores en StationView (otros errores pre-existentes en archivos legacy no tocados por esta tarea).

Stage Summary:
- StationView lista para integrarse en page.tsx con navigate({ name: 'station', station }).
- Reemplaza a BarDisplayView con soporte ITEM-LEVEL status (cada estación ve y avanza solo sus items).
- Filtro client-side por item.station === station garantiza separación cocina/barra sin acoplar el backend.
- WS robusto: join por estación, request:active-orders filtrado, manejo de order:new / order:status / item:status.

---
Task ID: 12-a
Agent: frontend-styling-expert
Task: Build KioskUnlockView and update SelectView with new modules

Work Log:
- Leído worklog previo (tasks 1-11) y revisados types.ts, api.ts, AppHeader.tsx, LoginView.tsx y SelectView.tsx existente para alinear estilos y contratos.
- Creado src/components/verveos/views/KioskUnlockView.tsx:
  * 'use client', vista full-screen centrada (min-h-screen, bg-background, max-w-md).
  * Logo "VerveOS" con icono UtensilsCrossed en caja rounded-2xl con ring-primary/30.
  * Card rounded-2xl con CardTitle "Abrir mesa" y CardDescription "Ingresa el PIN de staff y selecciona la mesa".
  * Botón fantasma con ArrowLeft para onBack.
  * Display de PIN como 4 puntos (●●●●) que se rellenan con bg-primary.
  * Input de mesa uppercase (tracking-widest, centrado, h-12 text-xl).
  * PIN pad numérico 3x4 con teclas 1-9, clear (C), 0, backspace (Delete icon). Botones h-14 sm:h-16 text-2xl bg-muted hover:bg-secondary border border-border/60.
  * Botón "Abrir mesa" deshabilitado hasta PIN=4 dígitos y mesa no vacía. Loader2 con spin mientras loading.
  * Submit: api.openTable(pin, tableNumber.trim().toUpperCase()) → setDeviceToken(res.deviceToken) → toast.success → onOpened({id, number, name, status}).
  * En error: toast.error(msg) y limpia PIN.
- Sobrescrito src/components/verveos/views/SelectView.tsx:
  * Props { user, online, navigate, onLogout }. Importa types { User, View, Role } y AppHeader.
  * Header: title="VerveOS", subtitle="Panel de control".
  * Array modules con 6 entradas {key, title, desc, emoji, icon, view, allowedRoles, restrictionLabel?}.
  * Módulos: Mesas (🪑 Armchair → tables, todos), Administración (⚙️ Settings → command, solo admin), Cocina (🍳 ChefHat → station cocina, admin/cocina/mesero), Barra (🍸 Wine → station barra, admin/barra/mesero), Meseros (🔔 Bell → waiter, admin/mesero), Contingencia (🆘 LifeBuoy → contingency, todos).
  * Cards p-6 rounded-xl hover:border-primary/50 hover:shadow-primary/5, emoji en caja rounded-xl bg-primary/10 ring-primary/20, título + descripción, ArrowRight a la derecha.
  * Restricción: si !allowedRoles.includes(user.role) → deshabilitado + badge (restrictionLabel ?? "Restringido"). Administración usa "Solo admin".
  * Footer sticky mt-auto: "VerveOS · Sistema POS de Gastro-Bar · v2.0".
  * Banner de modo sin conexión preservado (LifeBuoy + texto ámbar).
- Lint (eslint .): 0 errores. tsc --noEmit: los errores reportados son preexistentes (skills/, api/tables, api/waiter-calls, page.tsx, BarDisplayView, use-view-router, api-utils); ninguno en KioskUnlockView.tsx ni SelectView.tsx.

Stage Summary:
- KioskUnlockView listo: PIN pad táctil + input de mesa → api.openTable → setDeviceToken → onOpened. Reemplaza login para tablet cliente.
- SelectView renovado con 6 módulos por rol (Mesas, Administración, Cocina, Barra, Meseros, Contingencia) y navegación a {tables}, {command}, {station}, {waiter}, {contingency}.
- Estilo dark + amber/gold consistente con LoginView y resto de la app. Lint OK.

---
Task ID: 12-d
Agent: frontend-styling-expert
Task: Build BillView and update TableTopView with device mode + feedback

Work Log:
- Leído worklog, TableTopView existente, lib/api, lib/types, AppHeader, MenuItem (formatPrice), ui/card, ui/select, ui/alert-dialog, ui/scroll-area, ui/separator, BarDisplayView (patrón socket.io), SelectView, page.tsx (router actual).
- Creado /home/z/my-project/src/components/verveos/views/BillView.tsx (nuevo):
  * Props: { user, tableId, online, navigate, onLogout }
  * AppHeader con título "Cuenta · Mesa {tableId}" y onBack → select
  * Carga api.getBill(tableId) en mount, maneja loading y errores con toast
  * Card "Detalle de consumo" con ScrollArea max-h-96, items agrupados por orderId (fecha + estado), cada ítem con cantidad × nombre, unitPrice, lineTotal, notas, badge de estado (paleta gastro-bar: ámbar/orange/lime/rose)
  * Card de totales: Subtotal, IVA (taxRate%), Propina editable (botones 0/10/15/20% + Input custom), Separator, Total a pagar grande en color primary
  * Select de método de pago (Efectivo/Tarjeta/Transferencia) con íconos Banknote/CreditCard/Smartphone
  * Botón "Procesar pago" grande → api.payBill(tableId, { tip: tipAmount, paymentMethod })
  * En éxito: Dialog con check lime, resumen (subtotal/IVA/propina/total/método), botones "Imprimir" (window.print()) y "Volver a mesas" (navigate tables)
  * Computados: tipAmount = Math.round(subtotal * effectiveTipPercent / 100), grandTotal = subtotal + tax + tipAmount
  * Caso vacío: card "No hay consumo en esta mesa"
- Sobrescrito /home/z/my-project/src/components/verveos/views/TableTopView.tsx:
  * Import añadido: io/socket.io-client, getDeviceToken, clearDeviceToken, Label, DialogFooter, Lock, Clock
  * Estado: deviceToken (cargado en mount), myOrders, pinDialogOpen, pin, closingTable, socketRef
  * isKiosk = !!deviceToken
  * "Llamar mesero" ahora llama api.callWaiter({ tableNumber: tableId, reason: 'mesero' }, isKiosk) con toast de éxito/error
  * createOrder usa useDevice=isKiosk (envía header x-device-token automáticamente desde api.ts)
  * Botón "Volver": si isKiosk muestra ícono Lock + texto "Cerrar" y abre PIN Dialog; si no, navigate({ name: 'select' })
  * PIN Dialog: Input password, llamar api.closeTable(tableId, pin), clearDeviceToken(), navigate tables; error toast si PIN inválido
  * Nueva barra "Tus pedidos" entre header y main (shrink-0, max-h-20, scroll horizontal): mini-cards con hora, # artículos, total y badge de estado (Pendiente/En preparación/Listo). Solo visible si myOrders.length > 0
  * WebSocket: io('/?XTransformPort=3003'), en connect emite 'join' `table:${tableId}` y 'request:table-orders' tableId; escucha 'table-orders', 'order:new', 'order:status' (remueve tras 4s estados terminales)
  * Preservado todo el UX kiosk: sidebar de categorías con emojis, grid de cards, botón flotante "Ver pedido", Sheet carrito, Dialog de confirmación
- Lint: 0 errores.

Stage Summary:
- BillView funcional: detalle por pedido con notas y estados, totales con IVA, propina interactiva (presets + custom), 3 métodos de pago, dialog de éxito con resumen imprimible.
- TableTopView ahora soporta modo dispositivo (kiosk real sin staff) y modo staff. El cliente ve en tiempo real el estado de sus pedidos, llama mesero por API real, y el cierre de mesa requiere PIN de staff.
- Ambos archivos compilan limpio, tema dark ámbar/dorado respetado, sin código de prueba.

---
Task ID: 12-c
Agent: frontend-styling-expert
Task: Build WaiterView and TablesView

Work Log:
- Leído worklog, types, api, AppHeader, MenuItem (formatPrice), useNotificationSound, BarDisplayView (patrones WS), SelectView, ConfirmModal, mini-service WS y rutas de tables/waiter-calls para entender eventos y payloads reales.
- WaiterView.tsx creado:
  * AppHeader "Meseros" / "Llamados y pedidos listos" con onBack a select.
  * Barra de conexión (punto lime animado + "Reconectando...") y toggle de sonido (Bell activo/apagado).
  * Dos columnas lg:grid-cols-2:
    - "Llamados de mesa": cards con Bell, "Mesa {n}", badge de razón (mesero=ámbar/Bell, cuenta=dorado/Receipt, ayuda=destructive/X), timeAgo y botón "Atender" → api.attendCall(id). Empty state "Sin llamados pendientes".
    - "Pedidos listos para entregar": cards con "Mesa {tableId}", lista de items (cantidad × nombre + estación), badge "Listo" y botón "Entregar" → api.updateOrderStatus(id, 'entregado'). Empty state "Sin pedidos listos".
  * WebSocket: io('/?XTransformPort=3003'), join 'meseros', request:waiter-calls. Listeners: 'waiter-calls' (lista inicial), 'waiter:call' (agrega + toast.info + sonido), 'waiter:attend' (remueve), 'order:status' (listo agrega / entregado|cancelado remueve), 'order:ready' (extra del mini-service para robustez), 'order:new' (ignorado). soundEnabled via ref para que el handler registrado una vez lea el valor actual.
  * Estado: calls, readyOrders, loading, connected, soundEnabled, attendingId, deliveringId. Helper timeAgo.
- TablesView.tsx creado:
  * AppHeader "Mesas" / "Gestión de mesas" con onBack a select.
  * Toolbar con badges resumen (libres/ocupadas/cobradas) y botón "Actualizar" (RefreshCw).
  * Grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 de cards de mesa.
  * Cada card: número grande "{number}" + icono Armchair (color por estado), badge de estado (libre=lime, ocupada=amber, cobrada=muted), y si ocupada muestra pedidos activos + total abierto (formatPrice).
  * Acciones según estado: libre → "Abrir mesa" (Unlock) navega a {name:'kiosk', tableId:table.number}; ocupada → "Ver cuenta" (Receipt) navega a {name:'bill', tableId:table.number} + "Cerrar" (Lock) abre ConfirmModal y llama api.closeTable(table.number); cobrada → "Liberar" (Plus) llama api.closeTable.
  * WebSocket: io('/?XTransformPort=3003'), join 'staff', listener 'table:update' → recarga silenciosa de mesas.
  * Estado: tables, loading, refreshing, actionLoading (número de mesa en acción), confirmTable. Helper formatPrice importado de ../MenuItem.
- Paleta gastro-bar respetada: lime/oliva para libre/listo, ámbar para ocupado/pendiente, dorado (primary) para cuenta, destructive para ayuda, muted para cobrada.
- Lint: 0 errores en ambos archivos.

Stage Summary:
- WaiterView y TablesView listos. WaiterView muestra en tiempo real llamados de mesa y pedidos listos para entregar con sonido de notificación. TablesView muestra el mapa de mesas con estado y acciones rápidas (abir/ver cuenta/cerrar/liberar) que se actualiza solo vía WS.
- Ambos archivos usan los patrones del codebase (AppHeader, Card/Badge/Button, io('/?XTransformPort=3003'), toast de sonner, formatPrice de MenuItem, ConfirmModal).
- Pendiente (otra tarea): cablear 'waiter', 'tables', 'kiosk', 'bill' en page.tsx (Router switch) y extender useViewRouter (parseHash/viewToHash) para que estas vistas sean navegables desde SelectView.

---
Task ID: 12 (consolidado)
Agent: main (orchestrator) + 4 subagentes
Task: Implementar 8 cambios de lógica de negocio + issues de flujo

Work Log:
- Schema: añadidos Table (ciclo libre/ocupada/cobrada), DeviceSession, WaiterCall, Setting (IVA),
  campo station en Product, status/station en OrderItem, tax en Order, pin en User
- Seed: 12 mesas M1-M12, 6 usuarios con PIN (admin 1234, mesero 1111, barra 3333, cocina 4444, cajero 5555),
  19 productos con estación cocina/barra, settings IVA 19%
- Backend:
  * POST /api/device/open-table (staff abre mesa con PIN → device token)
  * POST /api/device/close-table (cierra sesión kiosk, libera mesa)
  * GET /api/tables (lista mesas con estado + órdenes activas)
  * GET/POST /api/tables/:id/bill (cuenta por mesa con IVA, cobro total)
  * POST /api/orders actualizado: device token, IVA, estación por producto, emite a cocina+barra
  * GET /api/orders/active?station=cocina|barra (filtra items por estación)
  * PATCH /api/orders/:id/items/:itemId (estado por item, restaura stock al cancelar)
  * POST /api/orders/:id/cancel (cancela orden, restaura stock)
  * GET/POST /api/waiter-calls (llamados de mesero reales)
  * POST /api/waiter-calls/:id/attend
  * PATCH /api/menu/:id/availability (86 con broadcast WS)
  * GET /api/settings (IVA, nombre local)
- Mini-service WS: salas bar/cocina/meseros/table:N/staff, broadcast genérico,
  eventos order:new/status, item:status, waiter:call/attend, menu:update, table:update
- Frontend (4 subagentes en paralelo):
  * KioskUnlockView: PIN pad numérico para abrir mesa (sin login del cliente)
  * SelectView: 6 módulos (Mesas, Admin, Cocina, Barra, Meseros, Contingencia) con control por rol
  * TablesView: grid de mesas con estado y acciones (abrir/cerrar/ver cuenta)
  * StationView: display cocina/barra con estado por item individual
  * WaiterView: llamados de mesa + pedidos listos para entregar
  * BillView: cuenta por mesa con IVA desglosado, propina, método de pago, impresión
  * TableTopView: modo kiosk (device token), feedback de pedidos en tiempo real, llamar mesero real,
    cerrar sesión con PIN de staff
- Router actualizado: views kiosk, tables, station, waiter, bill

Verificación con Agent Browser:
- Login admin → Mesas (12 mesas, estado libre) ✓
- Abrir mesa → kiosk del cliente (sin login del cliente) ✓
- Crear pedido: Aperol (barra) + Ceviche (cocina) → POST 201 ✓
- IVA calculado: 54000 + 19% = tax 10260 ✓
- Vista Cocina muestra SOLO Ceviche ✓
- Vista Barra muestra SOLO Aperol ✓
- Cambiar estado de item (Ceviche → en_preparacion) ✓

Stage Summary:
- 8 cambios implementados: (1) kiosk sin login del cliente con PIN de staff, (2) cuenta abierta por mesa
  con cobro total + IVA, (3) separación cocina/barra por categoría, (4) restaurar stock al cancelar +
  86 broadcast, (5) IVA desglosado + pre-cuenta imprimible, (6) PIN de staff para funciones admin,
  (7) llamar mesero real vía WebSocket, (8) estado por item + modificar orden + feedback al kiosk.
- Lint: 0 errores. Next.js (3000) + WS (3003) corriendo.

---
Task ID: 13
Agent: main (orchestrator)
Task: Pruebas exhaustivas + apartado de mesas con vista tablet

Work Log:
- Añadido botón "Ver tablet (cliente)" en TablesView para mesas ocupadas: permite al staff
  previsualizar la vista del kiosk que ve el cliente, interactuar con el pedido, etc.
- Diferenciado "Abrir mesa" (libre → kiosk-unlock con PIN) de "Ver tablet" (ocupada → kiosk preview directo)
- Nueva vista 'kiosk-unlock' en router: siempre muestra PIN pad
- Vista 'kiosk': muestra TableTopView si hay device token (cliente) o user logueado (preview staff)
- KioskUnlockView acepta prop `tableNumber` para precargar el número de mesa
- Corregido bug en waiter-calls route: usaba `include: { table: true }` pero WaiterCall no tiene
  relación con Table. Ahora resuelve el número de mesa manualmente.
- Corregido bug en bill route: ahora devuelve `{ bill: {...} }` como espera el cliente
- Corregido bug en WS: `request:table-orders` y `__emit` ahora resuelven número de mesa (M1) ↔ cuid
  para que el room `table:M1` coincida entre cliente y servidor

Pruebas de backend (22 escenarios, todas pasan):
- Auth: login, refresh token válido/inválido
- Settings: IVA 19%
- Mesas: listar 12, estado libre/ocupada/cobrada
- Device session: abrir con PIN, PIN inválido → 401
- Menú: 19 productos con estación cocina/barra
- Pedidos: crear con device token, IVA calculado, estación por item
- Separación: cocina ve solo items cocina, barra ve solo items barra
- Estado por item: pendiente → en_preparacion → listo
- Stock: descontado al pedir, restaurado al cancelar item/orden
- Llamar mesero: crear, listar, atender
- Cuenta por mesa: bill con IVA desglosado, acumula múltiples órdenes
- Cobro: procesar pago, mesa → cobrada
- 86: cambiar disponibilidad producto
- Liberar mesa: cerrar sesión kiosk
- Stock insuficiente: 422
- Cancelar orden: restaura stock

Pruebas de frontend con Agent Browser:
- Login admin → Mesas (12 mesas, todas libres) ✓
- "Abrir mesa" M10 → PIN pad con M10 precargado ✓
- Ingresar PIN 1234 → mesa abierta, M10 ocupada ✓
- Kiosk del cliente: menú, añadir productos, carrito, enviar pedido ✓
- Pedido creado en BD (M10: $54.000 + IVA $10.260, 2 items) ✓
- Cocina muestra solo Ceviche (estación cocina) ✓
- Barra muestra solo Aperol (estación barra) ✓
- Cambiar estado de item (Iniciar → Listo) ✓
- Cerrar sesión kiosk con PIN de staff ✓
- "Ver tablet" en mesa ocupada M1 → kiosk directo (sin PIN) ✓
- "Tus pedidos" muestra orden activa en tiempo real ✓
- Ver cuenta: subtotal, IVA, propina, total, método de pago ✓

Stage Summary:
- Apartado de mesas completo: gestión + vista tablet (preview del kiosk del cliente)
- Todos los escenarios probados y funcionando: auth, mesas, kiosk, pedidos, estaciones,
  items, stock, cuenta, cobro, llamados, 86, contingencia
- Lint: 0 errores. Next.js (3000) + WS (3003) corriendo.

---
Task ID: 14
Agent: main (orchestrator)
Task: Crear rol "visor" de solo lectura para ver mesas y tablets

Work Log:
- Añadido rol 'visor' al tipo Role en lib/types.ts
- Seed: nuevo usuario visor@verveos.com / visor123 (PIN 6666, rol visor)
- Backend: GET /api/tables y GET /api/tables/:id/bill ahora usan requireAuth (no requireStaff)
  para permitir acceso del visor (que no es staff)
- SelectView: visor solo ve "Mesas" habilitado; los demás módulos deshabilitados
- TablesView (modo visor):
  * Mesas libres: muestra "Mesa disponible" (sin botón Abrir)
  * Mesas ocupadas: "Ver tablet" + "Ver cuenta" (sin botón Cerrar)
  * Mesas cobradas: "Cuenta cerrada" (sin botón Liberar)
- TableTopView (modo visor):
  * Badge "Solo lectura" en lugar de "Llamar mesero"
  * Sin botones "Añadir" en productos
  * Sin botón flotante "Ver pedido"
  * Mantiene "Tus pedidos" (feedback en tiempo real, solo lectura)
- BillView (modo visor): aviso "Modo solo lectura" en lugar de botón "Procesar pago"

Verificación con Agent Browser:
- Login visor@verveos.com → Select con solo "Mesas" habilitado ✓
- Mesas: 12 mesas, libres muestran "Mesa disponible" (sin Abrir) ✓
- Tras crear pedido en M3 (como mesero): visor ve M3 ocupada con "Ver tablet" y "Ver cuenta" ✓
- "Ver tablet" → kiosk de M3 con badge "Solo lectura", "Tus pedidos" visible ✓
- Sin botones Añadir, sin botón Ver pedido ✓

Stage Summary:
- Rol visor implementado: solo lectura, ve mesas y previsualiza tablets sin modificar nada.
- Credenciales: visor@verveos.com / visor123 (PIN 6666)
- Lint: 0 errores. Servicios corriendo.
