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
