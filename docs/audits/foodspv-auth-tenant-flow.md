# FoodSPV Auth / Tenant Flow Audit

Fecha: 2026-07-03
Scope: `/admin`, `users/{uid}`, tenant resolution, and `PATCH /api/orders/status`

## Resumen Ejecutivo

FoodSPV ya tiene auth multi-tenant real.

La fuente de verdad para acceso interno es `users/{uid}`. El sistema no debe volver a reconstruirse alrededor de query strings, client-side guesses, o mapas paralelos de roles.

## Fuente de Verdad

El documento `users/{uid}` define el acceso operativo interno:

- `role`: `superadmin`, `tenant_admin`, o `employee`
- `tenantId`: tenant asignado al usuario cuando aplica
- `active`: permite bloquear usuarios inactivos sin borrar la cuenta

Archivos base:

- `src/modules/auth/services/userRoleService.ts`
- `src/modules/auth/services/authorizationService.ts`
- `src/modules/orders/components/OrdersDashboardClient.tsx`

## Roles Existentes

### `superadmin`

- Tiene acceso operativo global.
- No depende de un `tenantId` fijo en `users/{uid}` para operar `/admin`.
- Puede abrir `/admin?tenantId=...` como soporte puntual para un tenant específico.
- Conserva su dashboard principal en `/superadmin`.

### `tenant_admin`

- Administra un solo negocio.
- Su tenant operativo sale de `users/{uid}.tenantId`.
- `/admin` ignora cualquier `tenantId` externo para este rol.

### `employee`

- Opera pedidos dentro de un solo negocio.
- Su tenant operativo sale de `users/{uid}.tenantId`.
- `/admin` ignora cualquier `tenantId` externo para este rol.

## Como `/admin` Resuelve `tenantId`

Entrada en `src/app/admin/page.tsx`:

- Lee `searchParams.tenantId`.
- Lo pasa como `requestedTenantId` a `OrdersDashboardClient`.

Resolución real en `src/modules/orders/components/OrdersDashboardClient.tsx`:

1. El cliente escucha el usuario autenticado de Firebase Auth.
2. Luego lee `users/{uid}`.
3. Si el perfil no existe, es inválido, o `active === false`, no habilita tenant.
4. Si `role === "superadmin"`, puede usar `requestedTenantId` como tenant operativo temporal.
5. Si `role === "tenant_admin"` o `role === "employee"`, el tenant operativo sale solo de `profile.tenantId`.
6. Para `tenant_admin` y `employee`, cualquier `tenantId` externo queda efectivamente ignorado.

Conclusion:

- `/admin` ya no funciona como dashboard abierto por query string para roles internos comunes.
- `/admin?tenantId=...` solo tiene sentido como soporte para `superadmin`.

## Por Que `requestedTenantId` Solo Aplica A `superadmin`

Porque aceptar un `tenantId` externo para `tenant_admin` o `employee` rompería el aislamiento multi-tenant.

El modelo correcto es:

- identidad: Firebase Auth
- autorizacion: `users/{uid}`
- alcance tenant: `users/{uid}.tenantId`

`requestedTenantId` no es fuente de verdad. Es solo un selector operativo para `superadmin`, que ya tiene permisos globales.

## Validacion Backend De Pedidos

`src/app/api/orders/status/route.ts` usa:

- `requireEmployeeOrTenantAdmin(request, input.tenantId)`

Y `src/modules/auth/services/authorizationService.ts` valida:

- token Firebase server-side
- perfil en `users/{uid}`
- `active !== false`
- rol permitido
- match entre `auth.user.tenantId` y el `tenantId` solicitado cuando el usuario no es `superadmin`

Esto confirma que la proteccion backend ya existe y no depende de la UI.

## Que NO Debe Reconstruirse

No volver a implementar:

- auth paralela para `/admin`
- asignacion de tenant basada en query string para `tenant_admin` o `employee`
- listas separadas de roles fuera de `users/{uid}`
- validaciones frontend como sustituto de autorizacion backend
- “fixes” que intenten pasar `tenantId` manualmente para cambiar de negocio en usuarios no superadmin

## Decision Operativa

La intencion correcta es:

- `users/{uid}` = fuente de verdad
- `requestedTenantId` = soporte exclusivo para `superadmin`
- `tenant_admin` y `employee` = tenant fijado por perfil

## Impacto En Trabajo Futuro

Si una tarea futura pide “arreglar auth multi-tenant” para `/admin`, primero revisar este documento y los archivos fuente. Ese trabajo ya existe.

Lo correcto en adelante es documentar, aclarar naming, o endurecer validaciones puntuales, pero no duplicar el sistema.
