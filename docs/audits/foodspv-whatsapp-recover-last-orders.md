# FoodSPV WhatsApp Recover Last Orders

Fecha: 2026-07-03
Scope: webhook commands, tenant resolution by `phone_number_id`, recent order recovery, and authorization by sender phone

## Objetivo

Permitir que un negocio recupere por WhatsApp sus pedidos recientes aunque no abra el dashboard.

Este flujo depende de que los pedidos ya estén persistidos en Firestore antes de cualquier intento de WhatsApp.

## Comandos Disponibles

- `ULTIMO`
- `ÚLTIMO`
- `ULTIMOS`
- `ÚLTIMOS`
- `ULTIMOS 2`
- `ULTIMOS 3`
- `PEDIDOS`
- `AYUDA`

Normalización aplicada:

- `trim`
- `uppercase`
- remoción de acentos
- colapso de espacios

## Resolución Del Tenant

El webhook resuelve el tenant por `phone_number_id` recibido desde Meta.

Ruta de resolución:

1. `POST /api/webhook`
2. extracción de `phone_number_id`
3. búsqueda de `tenants` por `metaPhoneNumberId`
4. uso exclusivo de `tenants/{tenantId}/orders`

Si el tenant no se resuelve, el webhook ignora el comando y no devuelve pedidos.

## Límite De Pedidos

Límites soportados:

- `ULTIMO` = 1
- `ULTIMOS` = 3
- `PEDIDOS` = 3
- `ULTIMOS 2` = 2
- `ULTIMOS 3` = 3

Máximo absoluto:

- nunca más de 3 pedidos

## Fuente De Verdad

Firestore es la fuente de verdad.
WhatsApp es un canal secundario.

Los comandos de recuperación leen exclusivamente de:

- `tenants/{tenantId}/orders`

Esto exige que el pedido ya haya sido guardado antes de cualquier intento de envío por WhatsApp.

## Seguridad

Medidas aplicadas:

- no se mezclan pedidos entre tenants
- el tenant se resuelve por `phone_number_id`
- si `authorizedWhatsappPhones` existe en el tenant, solo esos números pueden consultar pedidos
- nunca se devuelven más de 3 pedidos
- no se devuelven tokens ni configuración privada

Modo MVP:

- si `authorizedWhatsappPhones` todavía no existe, el sistema responde comandos a cualquier número que escriba a la línea WhatsApp del tenant resuelto
- esto existe solo para compatibilidad operativa rápida y debe endurecerse configurando `authorizedWhatsappPhones`

## Formato De Respuesta

Cada resumen incluye:

- pedido/id corto
- fecha/hora
- cliente
- teléfono
- código cliente si existe
- productos resumidos
- total
- estado
- mensaje final: `Para ver más pedidos manda ULTIMOS 3`
