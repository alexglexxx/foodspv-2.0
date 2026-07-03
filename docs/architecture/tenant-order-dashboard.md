# Tenant Order Dashboard

FoodSPV opera pedidos por tenant en `/admin`.

Resolución actual de tenant:

- `tenant_admin` y `employee` usan exclusivamente `users/{uid}.tenantId`.
- `/admin?tenantId=...` queda como soporte puntual solo para `superadmin`.
- La fuente de verdad de acceso interno es `users/{uid}`.

Ver auditoría: `docs/audits/foodspv-auth-tenant-flow.md`.

## Estado y Flujo

Los estados oficiales viven en `orderStateAgent`:
- `pendiente`
- `preparando`
- `listo`
- `entregado`
- `cancelado`
- `requires_confirmation`

El flujo comercial principal es:

```txt
Pedidos Nuevos -> Pedidos Preparando -> Pedidos Listos -> Pedidos Entregados
```

`requires_confirmation` se muestra dentro de Pedidos Nuevos para que el negocio no pierda pedidos grandes, pero conserva su badge real.

## Kanban

El dashboard usa `onSnapshot()` sobre:

```txt
tenants/{tenantId}/orders
```

Cada columna muestra:
- Hora del pedido.
- Cliente y teléfono.
- Total.
- Método de entrega.
- Dirección si aplica.
- Productos y `selectedOptions`.
- Botones de transición válidos.

La UI usa scroll horizontal en móvil/tablet y cuatro columnas en desktop.

## Actualización

Las acciones llaman:

```txt
PATCH /api/orders/status
```

La API:
- Lee el pedido server-side.
- Valida `tenantId`, `orderId` y `nextState`.
- Rechaza transiciones inválidas.
- Actualiza `estado`, `updatedAt` y `statusUpdatedAt`.
- Envía notificación WhatsApp al cliente cuando aplica.
