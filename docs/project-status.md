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
