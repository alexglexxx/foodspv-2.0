# FoodSPV Product Quote Pricing

## Resumen

FoodSPV ahora soporta dos modos de precio por producto:

- `pricingMode: "fixed"` para productos con precio fijo.
- `pricingMode: "quote"` para productos que requieren cotización con el cliente.

La compatibilidad legacy se mantiene:

- Si `pricingMode` no existe, el sistema asume `fixed`.
- Si existe `price` pero no existe `pricingMode`, el producto sigue tratándose como fijo.

## Por qué no se usa `price: 0`

Usar `price: 0` para productos cotizables mezcla dos significados distintos:

- producto gratuito
- producto con precio aún no definido

Eso rompe métricas, dashboard, carrito, WhatsApp y validación de negocio. Por eso el modo cotizable se representa con `pricingMode: "quote"` y no con un precio en cero.

## Cliente público

En la tarjeta pública:

- `fixed` muestra el precio normal.
- `quote` muestra `Contáctenos para cotizar`.

Los productos cotizables incluyen ayuda automática:

`Agrégalo al carrito para solicitar cotización. Nos comunicaremos contigo lo más pronto posible.`

## Carrito y checkout

Los productos cotizables sí pueden entrar al carrito y mezclarse con productos de precio fijo.

El flujo usa:

- `hasQuoteItems`
- `totalMode: "fixed" | "partial_quote" | "quote_only"`

Reglas:

- `fixed`: todos los productos tienen precio fijo.
- `partial_quote`: hay mezcla de productos fijos y cotizables.
- `quote_only`: todos los productos requieren cotización.

El total solo suma productos `fixed`.

Mensajes UX:

- `Total: $X` cuando todo es fijo.
- `Total parcial: $X` cuando hay productos cotizables mezclados.
- `Por cotizar` cuando todo el pedido requiere cotización.

El checkout no bloquea pedidos cotizables. El negocio sigue recibiendo nombre, teléfono y notas para contactar al cliente.

## Backend y catálogo

El frontend puede enviar `pricingMode` para UX, pero el backend no confía en ese valor.

La ruta `src/app/api/orders/route.ts` valida cada producto contra el catálogo real del tenant y vuelve a calcular:

- `pricingMode`
- `precio`
- `hasQuoteItems`
- `totalMode`
- `total`

Si un producto del catálogo es `quote`, no se exige precio para aceptar el pedido.

## WhatsApp / comanda

Los pedidos con productos cotizables se envían con secciones separadas:

- `CON PRECIO`
- `POR COTIZAR`

Además:

- `partial_quote` muestra `Total parcial`.
- `quote_only` muestra `Total: Por cotizar`.

Mensaje operativo agregado:

`Este pedido incluye productos por cotizar. Contactar al cliente para confirmar precio y detalles.`

## Dashboard

El dashboard del tenant evita mostrar `$0` como venta cerrada para pedidos cotizables.

Estados visibles:

- total normal para `fixed`
- `Total parcial` para pedidos mixtos
- `Por cotizar` para pedidos solo cotizables
- badge `Cotización pendiente`

## Golden tenant

El seed `scripts/seed-golden-tenant.mjs` ahora:

- agrega `pricingMode: "fixed"` a los productos existentes
- incluye un producto cotizable `taquiza-evento`

Esto permite validar el flujo completo desde superadmin, menú público, carrito, pedido, WhatsApp y dashboard.
