# FOODSPV 2.0 — CODEX OPERATING SYSTEM

## PROJECT VISION

FoodSPV is a multi-tenant SaaS platform for restaurants, taco shops, dessert stores, and informal food businesses.

Main objective:

Reduce friction between customer and business.

Traditional flow:

Customer
→ asks questions
→ waits
→ sends incomplete order
→ business loses time

FoodSPV flow:

Customer
→ scans QR
→ opens tenant webapp
→ browses menu
→ adds products to cart
→ validates order
→ enters name + phone
→ generates structured order
→ order saved in Firestore
→ WhatsApp receives formatted order

No chat friction.

No manual order taking.

No repeated questions.

No chaos.

---

## CORE PRINCIPLES

1. Multi-tenant first
2. Mobile first
3. Modular architecture
4. Security by default
5. DRY code
6. Scalable architecture
7. Firestore = source of truth
8. WhatsApp = delivery channel only
9. Avoid patches
10. Complete files over code fragments

Al finalizar:

11. Actualizar CODEX.md
12. Actualizar docs/project-status.md
---

## CURRENT ARCHITECTURE

Current flow:

Customer WebApp
    ↓
Cart
    ↓
Order SDK
    ↓
Validator Agent
    ↓
Firestore Writer Agent
    ↓
WhatsApp Agent
    ↓
Business

Folder structure:

src/

modules/
    orders/
        agents/
        services/
        types/
        utils/

lib/

app/
    api/

---

## ACTIVE AGENTS

### Agent 01

Name:

Order Validator Agent

Responsibilities:

- validate tenantId
- validate customer
- validate products
- validate total
- reject malformed requests

Status:

COMPLETE

---

### Agent 02

Name:

Firestore Writer Agent

Responsibilities:

- persist order
- use serverTimestamp
- generate order id

Status:

COMPLETE

---

### Agent 03

Name:

WhatsApp Comanda Agent

Responsibilities:

- generate readable order
- emojis optional
- include:
    customer
    phone
    products
    totals

Status:

PENDING

---

### Agent 04

Name:

Tenant Router Agent

Responsibilities:

- route by tenant
- route by phone_number_id

Status:

PENDING

---

### Agent 05

Name:

Analytics Agent

Responsibilities:

- metrics
- top products
- orders/day
- sales

Status:

PENDING

---

### Agent 06

Name:

Order State Agent

Responsibilities:

- definir estados oficiales del pedido
- validar transiciones permitidas
- actualizar estado en Firestore para tenants `dashboard_managed`

Status:

COMPLETE

---

### Agent 07

Name:

Customer Status Notification Agent

Responsibilities:

- generar mensajes automáticos para el cliente cuando cambia el estado del pedido
- operar solo dentro del flujo `dashboard_managed`
- mantener separado el contenido del mensaje del envío por WhatsApp

Status:

COMPLETE

---

## TASK SYSTEM

Each task must follow:

TASK-001
TASK-002
TASK-003

Format:

Description:
Dependencies:
Files:
Expected result:
Status:

---

TASK-001

Description:

Create Order Validator Agent

Status:

COMPLETE

---

TASK-008

Description:

Crear Menú Dinámico + Carrito conectado

Dependencies:

- Firebase client
- tenants/{tenantId}/products
- Product types
- Cart types

Files:

- src/app/page.tsx
- src/modules/orders/components/OrderMenuClient.tsx
- src/modules/orders/components/ProductCard.tsx
- src/modules/orders/components/CartDrawer.tsx
- src/modules/orders/components/CartSummary.tsx

Expected result:

- catálogo dinámico por tenant
- carrito conectado
- total recalculado
- botón generar pedido

Status:

COMPLETE

---

TASK-009

Description:

Conectar el carrito visual con la API real de órdenes

Dependencies:

- TASK-008
- POST /api/orders
- Order types existentes
- Validación de cliente

Files:

- src/modules/orders/components/OrderMenuClient.tsx
- src/modules/orders/components/CustomerInfoModal.tsx
- src/modules/orders/services/orderService.ts

Expected result:

- modal obligatorio para nombre y teléfono
- validación local de cliente con nombre mínimo 4 caracteres y teléfono mínimo 10 dígitos
- envío real a `POST /api/orders`
- estados `isSubmitting`, `success` y `error`
- carrito mantiene el flujo visual anterior sin romper TASK-008

Status:

COMPLETE

---

TASK-010

Description:

Crear dashboard básico de pedidos en vivo para tenant_admin

Dependencies:

- Firestore client SDK
- tenantId por query string
- onSnapshot
- persistencia por tenant

Files:

- src/modules/orders/components/OrdersDashboardClient.tsx
- src/app/admin/page.tsx
- src/modules/orders/agents/firestoreWriterAgent.ts
- src/modules/orders/utils/getSearchParamValue.ts

Expected result:

- lectura desde `tenants/{tenantId}/orders`
- lista con orderId, cliente, teléfono, productos, total, estado y createdAt
- escucha en tiempo real con `onSnapshot()`
- estados loading, error, empty state y lista
- dashboard funcional con `/admin?tenantId=demo-tenant`

Status:

COMPLETE

---

TASK-011

Description:

Crear configuración de flujo de pedidos por tenant

Dependencies:

- tenant config types
- lectura de tenant en flujo de órdenes
- compatibilidad con `/api/orders`

Files:

- src/types/tenant.types.ts
- src/modules/orders/agents/tenantOrderFlowConfigAgent.ts
- src/app/api/orders/route.ts
- src/modules/orders/services/orderService.ts

Expected result:

- tipos para `orderFlowMode` y `estimatedPreparationMinutes`
- soporte para `simple_whatsapp` y `dashboard_managed`
- lectura tipada de configuración del tenant dentro del flujo de órdenes
- sin implementar todavía notificaciones ni botones de estado

Status:

COMPLETE

---

TASK-012

Description:

Implementar confirmación automática por WhatsApp al cliente en modo simple_whatsapp

Dependencies:

- TASK-011
- whatsappSenderAgent
- tenant config
- order types existentes

Files:

- src/modules/orders/agents/customerConfirmationAgent.ts
- src/modules/orders/agents/whatsappSenderAgent.ts
- src/modules/orders/agents/tenantOrderFlowConfigAgent.ts
- src/app/api/orders/route.ts

Expected result:

- confirmación automática al cliente solo si `orderFlowMode === "simple_whatsapp"`
- no enviar confirmación todavía en `dashboard_managed`
- reutilizar infraestructura existente de WhatsApp sin duplicarla

Status:

COMPLETE

---

TASK-013

Description:

Implementar cambio de estados de pedido para tenants en modo dashboard_managed

Dependencies:

- TASK-010
- TASK-011
- Firestore client SDK
- onSnapshot
- reglas oficiales de transición de estados

Files:

- src/modules/orders/agents/orderStateAgent.ts
- src/modules/orders/components/OrdersDashboardClient.tsx
- src/modules/orders/types/order.ts

Expected result:

- estados oficiales: `pendiente`, `preparando`, `listo`, `entregado`, `cancelado`
- transiciones válidas limitadas a la máquina de estados definida
- cancelación permitida solo desde `pendiente` y `preparando`
- actualización del documento `tenants/{tenantId}/orders/{orderId}` desde el dashboard
- badge visual de estado y botones condicionados por estado actual
- cambios reflejados en tiempo real con `onSnapshot()`
- sin notificaciones de WhatsApp todavía

Status:

COMPLETE

---

TASK-014

Description:

Implementar notificaciones automáticas al cliente cuando un pedido cambia de estado en modo dashboard_managed

Dependencies:

- TASK-011
- TASK-013
- orderStateAgent
- whatsappSenderAgent
- tenantOrderFlowConfigAgent

Files:

- src/modules/orders/agents/customerStatusNotificationAgent.ts
- src/modules/orders/agents/orderStateAgent.ts
- src/modules/orders/components/OrdersDashboardClient.tsx
- src/app/api/orders/status/route.ts
- docs/project-status.md
- CODEX.md

Expected result:

- notificación automática por WhatsApp al cliente solo cuando `orderFlowMode === "dashboard_managed"`
- no enviar mensaje si el estado no cambió realmente
- reutilizar `whatsappSenderAgent` sin duplicar lógica de WhatsApp
- mantener webhook sin cambios
- mensajes separados en `customerStatusNotificationAgent`

Status:

COMPLETE

---

TASK-015

Description:

Preparar prueba End-to-End completa del MVP y checklist de deploy real

Dependencies:

- TASK-008
- TASK-009
- TASK-010
- TASK-011
- TASK-012
- TASK-013
- TASK-014
- Firestore
- Firebase Admin
- Meta WhatsApp

Files:

- docs/testing/end-to-end-mvp-checklist.md
- docs/project-status.md
- CODEX.md

Expected result:

- checklist E2E completo para menú, carrito, pedido, WhatsApp negocio y cliente
- validación documentada para flujos `simple_whatsapp` y `dashboard_managed`
- checklist de deploy real con variables de entorno, Firebase Admin, Meta, build, lint y TypeScript
- sin cambios de lógica funcional

Status:

COMPLETE

---

TASK-002

Description:

Create Firestore Writer Agent

Status:

COMPLETE

---

TASK-003

Description:

Create WhatsApp Comanda Agent

Status:

PENDING

---

## MANDATORY REVIEW AFTER EACH TASK

After finishing every task:

1. Run build

npm run build

2. Verify imports

3. Verify aliases

4. Verify TypeScript

5. Verify no duplicate logic

6. Verify no hardcoded values

7. Verify architecture consistency

8. Document result

Review output:

PASSED
or

FAILED

with explanation

---

## NEVER DO

Do not:

- create duplicate files
- create parallel architectures
- create patches over patches
- hardcode secrets
- bypass validation
- mix legacy patterns

---

## FINAL OBJECTIVE

Build FoodSPV into a scalable SaaS platform capable of serving thousands of food businesses with minimal operational friction.
