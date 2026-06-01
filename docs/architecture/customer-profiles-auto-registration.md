# Customer Profiles Auto Registration

FoodSPV separates customers from internal users.

Customers are not Firebase Auth users, do not sign in, and do not have a role. Internal roles remain only for operational access such as `superadmin`, `tenant_admin`, and `employee`.

## Why Customer Is Not A User

A customer only needs to place a food order. Turning that person into an auth user would add passwords, sessions, role checks, recovery flows, and stored identity data that the checkout does not need.

FoodSPV keeps the checkout lightweight: name, phone, optional address for delivery, and a generated customer code.

## Why Customer Has No Role

Roles protect internal system capabilities. A customer has no dashboard permissions and no login, so a `customer` role would be misleading. The customer code is an order association key, not an authorization credential.

## First Order Flow

1. The customer fills the checkout with name, phone, and optional delivery address.
2. The order API creates a `customerProfile` under the tenant.
3. FoodSPV generates a unique code such as `CHUY-48291`.
4. The order stores both the legacy `cliente` fields and the new `customer` block.
5. The browser stores only the customer code in `localStorage` with key `foodspv_customer_code_{tenantId}`.
6. The UI shows: `Tu código de cliente es: {customerCode}. Guárdalo para tus próximos pedidos.`

## Recurrent Order Flow

1. The checkout reads `foodspv_customer_code_{tenantId}` from `localStorage`.
2. It looks up the profile by code and shows `Bienvenido {displayName}`.
3. The customer can keep the code, type another one, or forget it.
4. The order API associates the order with the existing profile, increments `totalOrders`, updates `lastOrderAt`, and adds a non-duplicate address when present.
5. The UI shows: `Pedido asociado a tu código de cliente: {customerCode}.`

## Collections

`tenants/{tenantId}/customerProfiles/{customerId}`

Stores the customer profile:

- `tenantId`
- `customerCode`
- `displayName`
- `phone`
- `phoneLast4`
- `totalOrders`
- `firstOrderAt`
- `lastOrderAt`
- `addresses`
- `notes`
- `blocked`

`tenants/{tenantId}/customerCodes/{customerCode}`

Stores the lookup index:

- `customerId`
- `customerCode`
- `tenantId`
- `createdAt`

## Security And Privacy

The browser stores only the customer code. It does not store phone, address, order history, or notes in `localStorage`.

The customer code is not authentication. It only helps the business associate repeat orders. Sensitive profile data remains server-side in Firestore.

Existing orders remain compatible because `cliente.nombre` and `cliente.telefono` are preserved. New orders additionally store:

```ts
customer: {
  customerId: string;
  customerCode: string;
  nombre: string;
  telefono: string;
}
```

## Future

The profile model is ready for customer history, promotions, and loyalty:

```txt
Cliente: 482-913
✓ 23 pedidos realizados
✓ Último pedido hace 4 días
✓ Dirección guardada
✓ Cliente frecuente
✓ Descuento automático
✓ Promociones VIP
```
