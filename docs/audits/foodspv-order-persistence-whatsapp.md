# FoodSPV Order Persistence Before WhatsApp

Fecha: 2026-07-03
Scope: `POST /api/orders`, Firestore persistence, tenant dashboard visibility, and WhatsApp delivery

## Regla Operativa

Firestore es la fuente de verdad.
WhatsApp es un canal secundario de notificación.

La secuencia correcta del flujo de pedido es:

1. Validar pedido
2. Resolver tenant
3. Crear o actualizar `customerProfile` y `customerCode`
4. Guardar pedido en `tenants/{tenantId}/orders/{orderId}`
5. Después intentar enviar WhatsApp

## Decision

Todo tenant activo debe guardar pedidos en Firestore, incluso cuando usa `orderFlowMode = "simple_whatsapp"`.

`simple_whatsapp` no significa “sin dashboard”.
Significa que el negocio opera principalmente por WhatsApp, pero el pedido sigue persistiendo y debe aparecer en `/admin`.

## Fuente De Verdad

El documento persistido en `tenants/{tenantId}/orders/{orderId}` es la fuente de verdad del pedido.

WhatsApp no debe ser tratado como:

- almacenamiento primario
- confirmación de existencia del pedido
- condición para responder éxito al checkout

## Comportamiento Esperado

Si Firestore falla:

- no se debe enviar WhatsApp
- el API debe responder error

Si Firestore guarda el pedido y WhatsApp falla:

- el pedido debe seguir existiendo en Firestore
- el API no debe responder como si el pedido se hubiera perdido
- la respuesta debe incluir `warning`
- el dashboard `/admin` debe seguir mostrando la orden

## Documento Minimo Del Pedido

El pedido persistido debe incluir al menos:

- `tenantId`
- `tenantSlug`
- `cliente`
- `customerId` si existe
- `customerCode` si existe
- `productos`
- `total`
- `estado`
- `orderState`
- `orderFlowMode`
- `whatsapp.attempted`
- `whatsapp.sent`
- `whatsapp.messageId`
- `whatsapp.error`
- `whatsapp.sentAt`
- `createdAt`
- `updatedAt`

## Resultado

El backend de pedidos debe responder con éxito cuando la orden ya fue persistida, aunque el intento de WhatsApp falle después.

La respuesta mínima debe incluir:

- `success`
- `orderId`
- `customerCode`
- `whatsapp.sent`
- `warning` cuando aplica
