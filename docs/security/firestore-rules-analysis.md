# Firestore Rules Analysis

Generated during local access-policy hardening.

## Instance

- Project: `foodspv-14829`
- Database: `(default)`
- Edition: `STANDARD`
- Type: `FIRESTORE_NATIVE`
- Location: `us-central1`

## Client Firestore Access

- Public menu previously read `tenants/{tenantId}` and `tenants/{tenantId}/products` from the browser.
- Internal dashboard reads `tenants/{tenantId}` and listens to `tenants/{tenantId}/orders` ordered by `createdAt desc`.
- Public order creation goes through `/api/orders`; it should not write directly from the browser.
- Customer profile lookup goes through `/api/customers/profile`; customer profile collections should not be exposed through browser rules.

## Server Firestore Access

- `users/{uid}` stores internal role profiles: `superadmin`, `tenant_admin`, `employee`, optional `tenantId`, and `active`.
- Superadmin APIs manage `tenants`, `products`, and soft deletes through Admin SDK.
- Public order API validates catalog data through Admin SDK and writes orders server-side.
- Webhook processing and WhatsApp notification flows use Admin SDK.

## Rules Policy

- Default deny for all unmatched paths.
- `users/{uid}` is readable only by the same user or superadmin; client writes are denied.
- `tenants/{tenantId}`, `products`, and `orders` are readable only by `superadmin` or active `tenant_admin`/`employee` assigned to the same tenant.
- Order status updates from client SDK require the same tenant access and can only change `estado`, `updatedAt`, and `statusUpdatedAt`.
- Customer profiles, customer codes, and webhook events are denied to client SDK.
- Public menu data must be served by a sanitized backend API, not by exposing mixed sensitive tenant documents.
