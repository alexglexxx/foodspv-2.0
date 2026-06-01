## TASK-021

Estado: COMPLETE

Resultado:

- SuperAdmin reorganizado con UI clara, cálida y menos pesada visualmente.
- Se reemplazó el header oscuro por un encabezado compacto "FoodSPV SuperAdmin".
- Se removieron de la UI los contadores globales de productos, pedidos, pendientes, ventas, tenants y activos.
- Secciones plegables agregadas para crear/editar negocio, negocios registrados, productos, theme y configuraciones operativas.
- Lista de negocios compacta con nombre, tenantId, estado, categoría y acciones principales.
- URL pública y QR se muestran solo para el negocio seleccionado.
- Productos del negocio seleccionado se administran con modal para crear/editar producto y modifiers.
- Sin cambios en webhook, QR backend, roles, orders API, App Hosting ni lógica de negocio.

## TASK-020

Estado: COMPLETE

Resultado:

- Nuevas rutas protegidas de SuperAdmin para `tenants/{tenantId}/products`
- Nuevo servicio backend `productService` con validación estricta de productos y modifiers
- Tipos SuperAdmin extendidos para productos, modifiers y respuestas de mutación/listado
- SuperAdmin ahora permite cargar, crear, editar y desactivar productos del tenant seleccionado
- UI separada en `ProductManager`, `ProductForm` y `ModifierEditor`
- Modifiers soportan `included`, `additive` y `tier_upgrade`, con activación/desactivación
- Sin cambios en webhook, Meta, QR, roles, App Hosting ni carrito público

## TASK-019

Estado: COMPLETE

Resultado:

- Nueva arquitectura inicial `src/modules/theme` con tipos, presets, normalización y `designerAgent`
- Modelo tenant extendido con `tenantTheme` para colores, tipografía y estilo visual
- SuperAdmin ahora permite configurar "Diseño visual" con colores, typography, visual style y presets rápidos
- El menú público lee `tenantTheme` desde Firestore y aplica tokens con CSS variables
- Si un tenant no tiene theme, el menú conserva el fallback visual actual
- Sin cambios en webhook, QR, Meta, modifiers, roles ni lógica de pedidos

## TASK-018

Estado: COMPLETE

Resultado:

- Nueva ruta pública dinámica `/{tenantId}` en `src/app/[tenant]/page.tsx`
- La página valida `tenants/{tenantId}` con Firestore Admin antes de renderizar
- Si el tenant no existe o `active === false`, responde con `notFound()`
- El menú público reutiliza `OrderMenuClient` con el `tenantId` de la URL
- Sin cambios en SuperAdmin, QR, webhook, Firebase App Hosting, carrito ni pedidos

## TASK-017

Estado: COMPLETE

Resultado:

- Tenants creados desde SuperAdmin ahora guardan `publicUrl` y `qrCode`
- URL pública generada desde `NEXT_PUBLIC_BASE_URL` + `tenantId`
- QR generado automáticamente como PNG Data URL con `qrcode`
- SuperAdmin muestra URL pública, QR, copia de URL y descarga del PNG
- Si falta `NEXT_PUBLIC_BASE_URL`, la API responde `NEXT_PUBLIC_BASE_URL no configurada` sin romper build
- Sin cambios en pedidos, webhooks, auth, dashboard actual ni carrito

## TASK-016

Estado: COMPLETE

Resultado:

- Nuevo módulo SuperAdmin en `/superadmin`
- Login con Firebase Auth desde cliente
- APIs protegidas en `/api/superadmin/tenants`
- Autorización server-side para rol `superadmin`
- Gestión global de tenants: listar, crear, editar y eliminar
- Métricas por tenant y globales: productos, pedidos, pendientes y ventas
- Firestore Admin aislado en backend; frontend consume DTOs vía Route Handlers
- Build verificado con `npm run build`

## TASK-015

Estado: COMPLETE

Resultado:

- Nuevo checklist End-to-End del MVP en `docs/testing/end-to-end-mvp-checklist.md`
- Checklist dividido por fases: menú/carrito, pedido, WhatsApp negocio, cliente y deploy
- Validaciones documentadas para `simple_whatsapp` y `dashboard_managed`
- Checklist de deploy real con Firebase Admin, Meta y verificaciones build/lint/TypeScript
- Sin cambios de lógica funcional

## TASK-014

Estado: COMPLETE

Resultado:

- Nuevo `customerStatusNotificationAgent` para generar mensajes por estado del pedido
- Nueva ruta `PATCH /api/orders/status` para actualizar estado server-side y reutilizar `whatsappSenderAgent`
- El envío al cliente solo ocurre cuando el tenant está en `dashboard_managed`
- Si el estado no cambió realmente, la ruta no reenvía WhatsApp
- El dashboard usa la ruta de estado y conserva `onSnapshot()` como fuente visual en tiempo real
- Webhook sin cambios

## TASK-013

Estado: COMPLETE

Resultado:

- Nuevo `orderStateAgent` con estados oficiales y validación de transiciones
- Dashboard admin ahora lee `orderFlowMode` del tenant y solo habilita acciones en `dashboard_managed`
- Cada pedido muestra badge visual de estado y botones condicionales según transición válida
- La actualización escribe en `tenants/{tenantId}/orders/{orderId}` con Firestore client SDK, sin tocar webhook ni enviar WhatsApp
- Los cambios siguen reflejándose en tiempo real mediante `onSnapshot()`

## TASK-012

Estado: COMPLETE

Resultado:

- Nuevo `customerConfirmationAgent` para generar mensaje automático al cliente
- `whatsappSenderAgent` reutilizado con destinatario opcional, sin duplicar infraestructura
- `POST /api/orders` ya envía confirmación al cliente solo en modo `simple_whatsapp`
- En modo `dashboard_managed` no se envía confirmación todavía

## TASK-011

Estado: COMPLETE

Resultado:

- Tipos de tenant actualizados con `orderFlowMode` y `estimatedPreparationMinutes`
- Nuevo agent para leer y normalizar configuración de flujo por tenant
- `POST /api/orders` ya deja disponible la configuración resuelta del flujo sin cambiar el comportamiento actual

## TASK-010

Estado: COMPLETE

Resultado:

- Dashboard admin en `/admin` leyendo `tenantId` desde query string
- Escucha en tiempo real con `onSnapshot()` sobre `tenants/{tenantId}/orders`
- Lista visual de pedidos con cliente, teléfono, productos, total, estado y timestamp
- Persistencia de órdenes ajustada para guardar por tenant y alimentar el dashboard

## TASK-009

Estado: COMPLETE

Resultado:

- Flujo de pedido conectado desde `OrderMenuClient` hacia `POST /api/orders`
- Modal `CustomerInfoModal` separado con nombre y teléfono obligatorios
- Validaciones cliente: nombre mínimo 4 caracteres y teléfono mínimo 10 dígitos reales
- Estados UI cubiertos: envío en progreso, éxito y error

## TASK-008

Estado: COMPLETE

Resultado:

- Menú dinámico leyendo productos desde `tenants/{tenantId}/products`
- Componentes separados para tarjeta de producto, drawer de carrito y resumen
- Carrito conectado con recálculo de total y borrador local de pedido
