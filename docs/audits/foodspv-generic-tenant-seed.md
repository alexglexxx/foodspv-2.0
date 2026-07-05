# FoodSPV Generic Tenant Seed

## Objetivo

FoodSPV ahora puede sembrar tenants nuevos desde un archivo JSON humano en lugar de crear un script por negocio.

Archivos:

- `data/tenant-seeds/{tenantId}.json`
- `scripts/seed-tenant-from-file.mjs`

## Cómo crear un nuevo JSON

1. Crear un archivo en `data/tenant-seeds/`.
2. Definir los campos mínimos del tenant.
3. Agregar el arreglo `products`.
4. Ejecutar el seed genérico.

Ejemplo:

```bash
npm run seed:tenant -- data/tenant-seeds/tommys-place.json
```

## Campos mínimos

El JSON debe incluir:

- `tenantId`
- `name`
- `category`
- `products`

Cada producto debe incluir:

- `id`
- `name`
- `category`

## Campos opcionales

El script completa defaults si faltan:

- `slug`
- `status`
- `active`
- `orderFlowMode`
- `currency`
- `locale`
- `timezone`
- `deliveryConfig`
- `orderConfirmationPolicy`
- `businessHours`
- `publicUrl`
- `qrCode`
- `createdAt`
- `updatedAt`

También acepta campos Meta/WhatsApp opcionales:

- `metaPhoneNumberId`
- `metaAccessToken`
- `metaBusinessAccountId`
- `metaWabaId`
- `metaAppId`
- `metaAppSecret`
- `webhookVerifyToken`

Si no vienen, quedan vacíos.

## Fixed vs quote

Cada producto puede definir:

- `pricingMode: "fixed"`
- `pricingMode: "quote"`

Reglas:

- si falta `pricingMode`, el script usa `fixed`
- si el producto es `fixed`, `price` default es `0`
- si el producto es `quote`, `pricingMode` manda sobre `price`

El script reporta cuántos productos son `fixed`, cuántos son `quote`, y advierte si hay productos `fixed` con `price: 0`.

## Seguridad

No hardcodear tokens reales en JSON si el archivo va a Git.

Para MVP o demos:

- dejar los campos Meta vacíos
- o inyectarlos después por superadmin

Si un tenant requiere secretos reales, ese JSON no debería subirse a GitHub.

## Edición posterior

El seed no reemplaza superadmin.

Después de sembrar el tenant:

- se puede ajustar diseño, textos y productos desde `/superadmin`
- el seed no borra tenants
- el seed no borra productos ausentes del JSON
- el seed usa `set(..., { merge: true })`, así que es idempotente
