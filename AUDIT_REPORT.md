# AUDIT_REPORT

## Alcance de la auditoria

Auditoria profunda del proyecto `FoodSPV 2.0` enfocada en:

- arquitectura real del repo
- seguridad de autenticacion y multi-tenant
- reglas y uso de Firestore
- rutas publicas y privadas
- flujo de pedidos
- integracion WhatsApp / webhook
- consistencia entre codigo, tests y documentacion
- capacidad real para cerrar el proyecto con calidad AAA

La auditoria se baso en lectura directa del codigo, revision de configuracion y ejecucion de verificaciones locales.

## Verificaciones ejecutadas

- `node /home/alexglex/alex-legacy-engine/scripts/startup-check.mjs ale`
- `node /home/alexglex/alex-legacy-engine/scripts/recall.mjs "FoodSPV 2.0 full project audit"`
- `npx -y firebase-tools@latest firestore:databases:list`
- `npx -y firebase-tools@latest firestore:databases:get '(default)'`
- `npm run lint`
- `npm test`
- `npm run build`

## Estado verificado del entorno

- Base Firestore detectada: `projects/foodspv-14829/databases/(default)`
- Edition: `STANDARD`
- Type: `FIRESTORE_NATIVE`
- Location: `us-central1`
- Delete protection: `DELETE_PROTECTION_DISABLED`
- Point-in-time recovery: `POINT_IN_TIME_RECOVERY_DISABLED`

## Hallazgos

### 1. Critico: el webhook de Meta acepta payloads sin verificacion criptografica de origen

Evidencia:

- [src/app/api/webhook/route.ts](/home/alexglex/foodspv-2.0/src/app/api/webhook/route.ts:45) procesa `POST` leyendo `request.json()` y continua directamente con ruteo, accion y worker.
- [src/app/api/webhook/route.ts](/home/alexglex/foodspv-2.0/src/app/api/webhook/route.ts:68) siempre responde `200`.
- La busqueda de firma no arroja uso de `x-hub-signature`, `x-hub-signature-256`, HMAC ni `app secret`.

Impacto:

- cualquier actor que conozca la URL del webhook puede enviar payloads falsos
- se pueden generar eventos falsos en `webhookEvents`
- se pueden disparar respuestas automaticas no autorizadas
- se puede ensuciar logging operativo y dificultar trazabilidad real
- se rompe el supuesto de confianza del canal con Meta

Riesgo:

- alto riesgo de abuso operativo y de seguridad
- alto riesgo de ruido, spam y respuestas fuera de contexto

Recomendacion:

- validar firma `x-hub-signature-256` con el raw body y `META_APP_SECRET`
- rechazar con `401/403` antes de parsear JSON si la firma no coincide
- dejar de responder `200` a payloads no autenticos
- agregar tests de firma valida, firma invalida y body alterado

### 2. Critico: el flujo webhook no es idempotente y puede duplicar respuestas ante reintentos de Meta

Evidencia:

- [src/modules/whatsapp/agents/whatsappWorkerAgent.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/agents/whatsappWorkerAgent.ts:172) crea un documento nuevo en `webhookEvents` con `add()` en cada recepcion.
- [src/modules/whatsapp/agents/whatsappWorkerAgent.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/agents/whatsappWorkerAgent.ts:202) extrae mensajes entrantes.
- [src/modules/whatsapp/agents/whatsappWorkerAgent.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/agents/whatsappWorkerAgent.ts:222) envia respuesta por cada mensaje sin verificar si `messageId` ya fue procesado antes.

Impacto:

- si Meta reintenta el mismo evento, el sistema puede responder multiples veces al mismo cliente
- se generan registros duplicados
- se vuelve imposible asegurar exactamente-once o al menos once con deduplicacion

Riesgo:

- alto riesgo operativo
- alto riesgo reputacional frente al cliente final

Recomendacion:

- deduplicar por `messageId` de WhatsApp antes de responder
- definir una clave idempotente estable en `webhookEvents`
- registrar `processedMessageIds` o una coleccion dedicada de inbound messages
- responder de forma segura a retries legitimos sin duplicar side effects

### 3. Critico: el auto-reply del webhook no es realmente multi-tenant; usa credenciales globales y no las del tenant

Evidencia:

- [src/modules/whatsapp/agents/whatsappWorkerAgent.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/agents/whatsappWorkerAgent.ts:223) llama `sendWhatsAppTextMessage` pasando `to`, `body` y `phoneNumberId`.
- [src/modules/whatsapp/services/whatsappCloudService.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/services/whatsappCloudService.ts:100) toma el token desde `process.env.META_WHATSAPP_TOKEN`.
- [src/modules/whatsapp/services/whatsappCloudService.ts](/home/alexglex/foodspv-2.0/src/modules/whatsapp/services/whatsappCloudService.ts:101) usa `input.phoneNumberId` o fallback global `META_WHATSAPP_PHONE_NUMBER_ID`.
- En contraste, el flujo principal de negocio si usa credenciales por tenant en [src/modules/orders/agents/whatsappSenderAgent.ts](/home/alexglex/foodspv-2.0/src/modules/orders/agents/whatsappSenderAgent.ts:152) y [src/modules/orders/agents/whatsappSenderAgent.ts](/home/alexglex/foodspv-2.0/src/modules/orders/agents/whatsappSenderAgent.ts:157).

Impacto:

- el webhook puede responder con un token global no alineado al tenant detectado
- en un escenario multi-tenant real, el mensaje podria salir con credenciales incorrectas
- el modelo de seguridad y configuracion queda inconsistente entre flujos

Riesgo:

- alto riesgo de fuga operacional entre tenants
- alto riesgo de fallo silencioso o envio desde la cuenta equivocada

Recomendacion:

- eliminar el uso de credenciales globales del flujo multi-tenant
- pasar `metaAccessToken` y `metaPhoneNumberId` del tenant resuelto hasta el cliente Meta
- si se quiere modo single-tenant, hacerlo explicito y mutuamente excluyente

### 4. Alto: la ruta publica `/{tenant}` no bloquea tenants inactivos aunque la API del menu si lo hace

Evidencia:

- [src/app/[tenant]/page.tsx](/home/alexglex/foodspv-2.0/src/app/[tenant]/page.tsx:35) solo hace `notFound()` por `deletedAt`.
- [src/app/[tenant]/page.tsx](/home/alexglex/foodspv-2.0/src/app/[tenant]/page.tsx:44) renderiza `OrderMenuClient` aunque el tenant este inactivo.
- [src/app/api/menu/[tenantId]/route.ts](/home/alexglex/foodspv-2.0/src/app/api/menu/[tenantId]/route.ts:110) si bloquea `active === false`, `status === "inactive"` y `deletedAt`.
- La documentacion previa declara que la pagina publica debe responder `notFound()` para tenants inactivos, pero el codigo actual no lo cumple.

Impacto:

- un tenant inactivo sigue teniendo pagina publica accesible
- la UX queda inconsistente: la pagina abre pero la API puede devolver 404
- el control comercial de desactivacion no es confiable en el primer nivel de la ruta publica

Riesgo:

- alto riesgo de inconsistencia funcional
- riesgo comercial y de confianza del negocio

Recomendacion:

- replicar en `src/app/[tenant]/page.tsx` la validacion de disponibilidad del tenant
- centralizar esta regla en un helper server-side unico
- agregar test que verifique 404 para `active=false` y `status=inactive`

### 5. Alto: la autorizacion de superadmin ignora el campo `active`, permitiendo acceso a usuarios desactivados

Evidencia:

- [src/modules/superadmin/services/authService.ts](/home/alexglex/foodspv-2.0/src/modules/superadmin/services/authService.ts:43) solo valida rol en documento `users/{uid}`.
- [src/modules/superadmin/services/authService.ts](/home/alexglex/foodspv-2.0/src/modules/superadmin/services/authService.ts:65) autoriza por claim o rol de documento, pero no revisa `active`.
- El flujo general si bloquea usuarios inactivos en [src/modules/auth/services/authorizationService.ts](/home/alexglex/foodspv-2.0/src/modules/auth/services/authorizationService.ts:76).

Impacto:

- un superadmin marcado como inactivo puede seguir usando APIs de superadmin
- la politica de desactivacion no es consistente entre backends

Riesgo:

- alto riesgo de acceso no deseado tras deshabilitacion administrativa

Recomendacion:

- unificar la autorizacion de superadmin con el servicio comun
- exigir `active !== false` para superadmin tambien
- agregar test de `401/403` para superadmin inactivo

### 6. Alto: el borrado permanente de tenant no elimina todas las subcolecciones y puede dejar PII huerfana

Evidencia:

- [src/app/api/tenants/[tenantId]/route.ts](/home/alexglex/foodspv-2.0/src/app/api/tenants/[tenantId]/route.ts:6) solo considera `products` y `orders`.
- [src/app/api/tenants/[tenantId]/route.ts](/home/alexglex/foodspv-2.0/src/app/api/tenants/[tenantId]/route.ts:75) elimina el documento del tenant despues de borrar solo esas dos subcolecciones.
- El proyecto tambien usa `customerProfiles` y `customerCodes` bajo `tenants/{tenantId}` en [src/modules/customers/server/upsertCustomerProfile.ts](/home/alexglex/foodspv-2.0/src/modules/customers/server/upsertCustomerProfile.ts:231) y [src/app/api/customers/profile/route.ts](/home/alexglex/foodspv-2.0/src/app/api/customers/profile/route.ts:57).

Impacto:

- datos de clientes pueden quedar vivos sin tenant padre
- el borrado no cumple expectativa de eliminacion completa
- se deja deuda de privacidad y housekeeping en Firestore

Riesgo:

- alto riesgo de incumplimiento operativo y de privacidad

Recomendacion:

- incluir todas las subcolecciones reales del tenant en el proceso
- definir politica clara: hard delete total, soft delete, o archivado
- si se conserva historial, moverlo a estructura de archival explicitamente

### 7. Alto: el ruteo del webhook por `metaPhoneNumberId` no garantiza unicidad y puede enrutar al tenant equivocado

Evidencia:

- [src/modules/webhook/agents/tenantRouterAgent.ts](/home/alexglex/foodspv-2.0/src/modules/webhook/agents/tenantRouterAgent.ts:43) busca tenants por `metaPhoneNumberId`.
- [src/modules/webhook/agents/tenantRouterAgent.ts](/home/alexglex/foodspv-2.0/src/modules/webhook/agents/tenantRouterAgent.ts:46) usa `limit(10)`.
- [src/modules/webhook/agents/tenantRouterAgent.ts](/home/alexglex/foodspv-2.0/src/modules/webhook/agents/tenantRouterAgent.ts:56) toma el primer documento activo encontrado.
- La validacion de tenants revisada no evidencia una restriccion de unicidad sobre `metaPhoneNumberId`.

Impacto:

- si dos tenants comparten accidentalmente el mismo `metaPhoneNumberId`, el ruteo queda no determinista
- mensajes y automatizaciones pueden asignarse al negocio incorrecto

Riesgo:

- alto riesgo multi-tenant

Recomendacion:

- imponer unicidad de `metaPhoneNumberId` a nivel de escritura
- si la consulta devuelve mas de un tenant, tratarlo como error operativo, no como exito
- agregar chequeo preventivo en create/update de tenant

### 8. Medio: la API publica de customer profiles expone identificadores y nombres sobre un codigo facil de enumerar

Evidencia:

- [src/modules/customers/utils/generateCustomerCode.ts](/home/alexglex/foodspv-2.0/src/modules/customers/utils/generateCustomerCode.ts:13) genera codigo con prefijo de tenant y numero aleatorio de 5 digitos.
- [src/app/api/customers/profile/route.ts](/home/alexglex/foodspv-2.0/src/app/api/customers/profile/route.ts:22) expone una API `GET` sin autenticacion.
- [src/app/api/customers/profile/route.ts](/home/alexglex/foodspv-2.0/src/app/api/customers/profile/route.ts:78) devuelve `customerId`, `customerCode` y `displayName`.

Impacto:

- los codigos son relativamente adivinables
- existe superficie para enumerar perfiles por tenant y extraer nombres visibles
- la informacion de cliente no esta totalmente cerrada aunque Firestore rules la oculten

Riesgo:

- riesgo medio de privacidad
- riesgo medio de scraping por fuerza bruta si el endpoint se expone publicamente

Recomendacion:

- endurecer el formato del codigo o reemplazarlo por token no enumerable
- reducir la respuesta publica al minimo indispensable
- aplicar rate limiting y monitoreo de abuso
- reconsiderar si `customerId` debe salir al cliente

### 9. Medio: la cobertura de tests da una falsa sensacion de seguridad porque valida texto del archivo, no comportamiento real

Evidencia:

- [tests/access-policy.test.mjs](/home/alexglex/foodspv-2.0/tests/access-policy.test.mjs:5) lee archivos como texto con `readFileSync`.
- [tests/access-policy.test.mjs](/home/alexglex/foodspv-2.0/tests/access-policy.test.mjs:79) usa `assert.match` sobre regex del codigo fuente.
- La suite no ejecuta rutas reales con requests, no usa Firebase Emulator y no prueba webhook, catalogo, tenant public page ni customer profile de extremo a extremo.

Impacto:

- cambios que mantengan strings pero rompan comportamiento pueden seguir pasando
- hay huecos grandes justo en las zonas de mayor riesgo

Riesgo:

- riesgo medio de regresiones no detectadas

Recomendacion:

- mantener estos tests solo como smoke checks textuales si aportan valor
- agregar tests reales de route handlers y servicios criticos
- incorporar Firebase Emulator para auth/rules/datos

### 10. Medio: la documentacion operativa ya esta desfasada respecto al producto actual

Evidencia:

- [docs/testing/end-to-end-mvp-checklist.md](/home/alexglex/foodspv-2.0/docs/testing/end-to-end-mvp-checklist.md:11) sigue pidiendo acceso a `/admin?tenantId={tenantId}`.
- [docs/architecture/tenant-order-dashboard.md](/home/alexglex/foodspv-2.0/docs/architecture/tenant-order-dashboard.md:3) sigue describiendo la operacion por tenant en `/admin?tenantId=...`.
- El dashboard nuevo del tenant vive en `/dashboard`.

Impacto:

- QA y operacion pueden probar la ruta equivocada
- la documentacion ya no refleja la experiencia principal del tenant

Riesgo:

- riesgo medio de confusion operativa y validaciones incorrectas

Recomendacion:

- actualizar docs a la ruta vigente y diferenciar claramente `/dashboard` de `/admin` y `/superadmin`
- dejar contrato explicito de cada superficie

### 11. Bajo: el repositorio mantiene metadata y onboarding de template, no de producto real

Evidencia:

- [README.md](/home/alexglex/foodspv-2.0/README.md:1) sigue siendo el README generico de Create Next App.
- [src/app/layout.tsx](/home/alexglex/foodspv-2.0/src/app/layout.tsx:15) mantiene metadata `Create Next App`.
- [src/app/page.tsx](/home/alexglex/foodspv-2.0/src/app/page.tsx:10) sigue mostrando una pantalla de error pidiendo `?tenantId=` en la raiz.

Impacto:

- onboarding pobre para dev, QA y deploy
- SEO y metadata de producto aun no estan alineados
- la entrada raiz del producto no expresa el estado real del sistema

Riesgo:

- riesgo bajo de calidad percibida
- riesgo bajo de operacion interna ineficiente

Recomendacion:

- reemplazar metadata base
- convertir README en documento real de operacion
- decidir el destino correcto de `/`: landing operativa, redirect, selector o pantalla de diagnostico

## Riesgos globales

- La mayor concentracion de riesgo esta en el flujo WhatsApp/webhook, no en el dashboard nuevo.
- El aislamiento multi-tenant esta razonablemente bien encaminado en lectura de pedidos y status update, pero todavia no es confiable extremo a extremo mientras webhook y credenciales no queden unificados.
- La politica de activacion/inactivacion no es uniforme entre pagina publica, superadmin y backend comun.
- La suite actual pasa, pero no garantiza integridad funcional ni de seguridad real.

## Conclusiones

- El proyecto ya no esta en fase de prototipo vacio; hay una base funcional real para menu publico, pedidos, superadmin y dashboard tenant.
- El cuello de botella para cerrar el proyecto con calidad AAA no es construir mas UI, sino cerrar seguridad, consistencia operativa y pruebas reales.
- Hoy el proyecto puede compilar y pasar lint/tests, pero todavia no deberia considerarse terminado para produccion multi-tenant por los riesgos del webhook, desactivacion inconsistente y borrado incompleto de datos.
- La deuda documental ya es suficiente para causar errores de QA y soporte aunque el codigo compile.

## Recomendaciones

- Tratar el flujo webhook/WhatsApp como prioridad absoluta de cierre.
- Unificar politicas de acceso y estado (`active`, `inactive`, borrado) en un solo contrato compartido.
- Elevar la calidad del testing desde regex sobre archivos a pruebas ejecutables contra rutas y servicios.
- Cerrar la historia de lifecycle del tenant completo: alta, operacion, desactivacion, borrado y archival.
- Actualizar documentacion y onboarding inmediatamente despues de estabilizar seguridad y contratos.

## Arbol de tareas para terminar el proyecto por importancia

### P0 - Bloqueadores de produccion

#### TASK-A01 - Verificacion criptografica del webhook Meta

Objetivo:

- validar `x-hub-signature-256` con raw body y secreto de app

Entregables:

- helper de verificacion HMAC
- rechazo `401/403` a payloads no autenticos
- tests de firma valida/invalida
- variable documentada para `META_APP_SECRET`

Criterio de terminado:

- no se procesa ningun webhook no firmado correctamente

#### TASK-A02 - Idempotencia real para inbound WhatsApp

Objetivo:

- impedir respuestas duplicadas sobre retries del mismo mensaje

Entregables:

- dedupe por `messageId`
- almacenamiento idempotente de eventos o inbound messages
- pruebas de retry doble con mismo payload

Criterio de terminado:

- el mismo mensaje entrante solo produce un side effect

#### TASK-A03 - Unificacion multi-tenant del envio WhatsApp

Objetivo:

- eliminar credenciales globales del flujo webhook y usar solo credenciales del tenant

Entregables:

- refactor de `sendWhatsAppTextMessage`
- contrato unico de envio Meta
- validacion explicita de tenant config

Criterio de terminado:

- todos los envios salen con credenciales del tenant correcto

#### TASK-A04 - Politica uniforme de activacion/inactivacion

Objetivo:

- aplicar la misma regla de `active/status/deletedAt` en pagina publica, APIs y superadmin

Entregables:

- helper compartido server-side
- fix en `/{tenant}`
- fix en auth superadmin para respetar `active`
- tests de tenants/usuarios inactivos

Criterio de terminado:

- un tenant o usuario inactivo queda bloqueado en todas las superficies

#### TASK-A05 - Borrado completo o archival formal del tenant

Objetivo:

- cerrar correctamente el lifecycle de datos del tenant

Entregables:

- inclusion de `customerProfiles`, `customerCodes` y cualquier subcoleccion real
- decision explicita entre hard delete y archival
- procedimiento probado en entorno controlado

Criterio de terminado:

- no quedan datos huerfanos tras eliminar un tenant

### P1 - Integridad del modelo multi-tenant

#### TASK-B01 - Restricciones de unicidad operativa

Objetivo:

- impedir colisiones en `metaPhoneNumberId`, `slug` y otros identificadores criticos

Entregables:

- chequeos preventivos en create/update
- errores claros si existe duplicado
- tests de conflicto

Criterio de terminado:

- no se puede guardar configuracion ambigua entre tenants

#### TASK-B02 - Endurecimiento de customer profiles publicos

Objetivo:

- reducir enumerabilidad y fuga de identificadores

Entregables:

- nuevo formato de customer code o token mas fuerte
- respuesta publica minimizada
- rate limiting
- monitoreo de abuso

Criterio de terminado:

- el endpoint no permite scraping razonable de perfiles

#### TASK-B03 - Reglas Firestore y contrato de acceso final

Objetivo:

- pasar de hardening inicial a contrato final documentado y probado

Entregables:

- revision final de `firestore.rules`
- emulador con pruebas de acceso
- documento de superficies cliente/Admin SDK

Criterio de terminado:

- reglas y rutas backend reflejan el mismo modelo de acceso

### P2 - Testing AAA

#### TASK-C01 - Test harness real para route handlers

Objetivo:

- probar comportamiento, no strings del codigo fuente

Entregables:

- tests para `/api/orders`, `/api/orders/status`, `/api/menu/[tenantId]`, `/api/customers/profile`, `/api/webhook`
- mocks o emulador para Firebase Admin y Auth

Criterio de terminado:

- regresiones funcionales rompen tests de verdad

#### TASK-C02 - Firebase Emulator Suite para auth/rules/data

Objetivo:

- validar multi-tenant y reglas con entorno reproducible

Entregables:

- setup de emulador
- fixtures de tenants/users/orders
- scripts de ejecucion en CI local

Criterio de terminado:

- los escenarios de acceso cruzado se validan automaticamente

#### TASK-C03 - Pruebas end-to-end del journey completo

Objetivo:

- cubrir menu publico, pedido, dashboard tenant y superadmin

Entregables:

- flujo de compra
- flujo de cambio de estado
- flujo de activacion/inactivacion
- flujo de eliminacion de tenant

Criterio de terminado:

- los journeys criticos pasan sin intervencion manual

### P3 - Producto, operacion y documentacion final

#### TASK-D01 - Unificacion de entrypoints del producto

Objetivo:

- decidir comportamiento correcto de `/`, `/{tenant}`, `/dashboard`, `/admin` y `/superadmin`

Entregables:

- matriz de rutas y audiencias
- ajustes de UX y redirects
- remocion de mensajes de error heredados en raiz si ya no aplican

Criterio de terminado:

- cada audiencia entra por una superficie clara y vigente

#### TASK-D02 - Documentacion operativa real

Objetivo:

- reemplazar docs heredadas y desfasadas por documentacion util

Entregables:

- README real del proyecto
- arquitectura actualizada
- checklist E2E actualizado
- runbook de variables y credenciales

Criterio de terminado:

- cualquier dev/QA puede levantar, probar y operar el sistema sin contexto oral

#### TASK-D03 - Metadata, branding y cierre de calidad visual base

Objetivo:

- quitar restos de template y dejar identidad minima consistente

Entregables:

- metadata real de app
- titles/descriptions correctos
- limpieza de placeholders heredados

Criterio de terminado:

- no quedan rastros visibles de `Create Next App`

## Orden recomendado de ejecucion

1. `TASK-A01`
2. `TASK-A02`
3. `TASK-A03`
4. `TASK-A04`
5. `TASK-A05`
6. `TASK-B01`
7. `TASK-B02`
8. `TASK-B03`
9. `TASK-C01`
10. `TASK-C02`
11. `TASK-C03`
12. `TASK-D01`
13. `TASK-D02`
14. `TASK-D03`

## Resultado final de la auditoria

- `npm run lint`: OK
- `npm test`: OK
- `npm run build`: OK
- El estado de compilacion actual no contradice los hallazgos anteriores; simplemente confirma que los riesgos identificados son de seguridad, consistencia, operacion y cobertura, no de compilacion basica.
