# FoodSPV — Auth Tenant Flow Audit

## Resumen

Se auditó el sistema de autenticación, usuarios, roles, administrador de negocio y tenant dashboard de FoodSPV.

Conclusión: el flujo multi-tenant base ya existe y no debe reconstruirse desde cero.

## Fuente de verdad

Firestore usa:

- users/{uid}

Campos esperados:

- email
- role
- tenantId
- active
- createdAt
- updatedAt

## Roles actuales

- superadmin
- tenant_admin
- employee

## Archivos clave

- src/modules/auth/services/userRoleService.ts
- src/modules/auth/services/authorizationService.ts
- src/modules/auth/types/userRole.ts
- src/modules/orders/components/OrdersDashboardClient.tsx
- src/modules/dashboard/components/TenantDashboardClient.tsx
- src/app/admin/page.tsx
- src/app/superadmin/page.tsx
- src/app/api/orders/status/route.ts

## Hallazgos confirmados

userRoleService.ts lee users/{uid} desde Firestore.

authorizationService.ts valida Firebase ID Token con adminAuth.verifyIdToken().

Existen funciones de autorización:

- requireUserAuth()
- requireSuperAdmin()
- requireTenantAccess()
- requireTenantAdmin()
- requireEmployeeOrTenantAdmin()

/api/orders/status usa requireEmployeeOrTenantAdmin(request, input.tenantId).

/admin/page.tsx renderiza OrdersDashboardClient.

OrdersDashboardClient lee users/{uid} y resuelve el tenant real desde profile.tenantId para tenant_admin y employee.

requestedTenantId por URL solo aplica para superadmin como modo soporte.

tenant_admin y employee ignoran tenantId externo y no pueden cambiar de negocio desde query param.

## Qué ya está hecho

- Modelo userId → role → tenantId → active.
- Roles básicos.
- Fuente de verdad users/{uid}.
- Validación backend con Firebase Admin.
- Protección de cambio de estado de pedidos.
- Dashboard de negocio con resolución de tenant por usuario.

## Qué NO debe repetirse

No volver a crear desde cero:

- userId → tenantId
- roles básicos
- authorizationService
- users/{uid}
- tenant dashboard básico
- protección básica de cambio de estado de pedidos

## Riesgos pendientes

- Documentar mejor requestedTenantId como modo soporte superadmin.
- Verificar si existe UI cómoda para crear tenant_admin desde superadmin.
- Confirmar reglas Firestore para lectura de users/{uid}, tenants/{tenantId} y orders.

## Próximos pasos recomendados

1. Documentar esta auditoría también en ALE.
2. Agregar comentario en /admin/page.tsx explicando que requestedTenantId solo es soporte superadmin.
3. Revisar si superadmin puede crear tenant_admin de forma cómoda.
4. No rediseñar auth salvo que haya evidencia de bug real.
