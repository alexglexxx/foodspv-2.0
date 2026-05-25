# FoodSPV — Next.js Official Architecture Rules

> Documento base del proyecto.
>
> Fuente principal:
> Next.js Official Documentation (App Router)
>
> Objetivo:
> Mantener una arquitectura limpia, escalable y evitar mezclar tecnologías o patrones que rompan builds, deploys y mantenimiento.

---

# 1. Filosofía del proyecto

FoodSPV seguirá:

- Next.js App Router
- Firebase App Hosting
- Firestore
- Firebase Authentication
- Firebase Admin SDK
- Arquitectura modular enterprise
- Multi-tenant SaaS

Regla máxima:

"Una solución simple y oficial vale más que cinco hacks."

---

# 2. Estructura oficial del proyecto

```txt
foodspv/

src/

├── app/
│
│   ├── (public)/
│   │
│   ├── admin/
│   │
│   ├── api/
│   │   ├── webhook/
│   │   ├── orders/
│   │   └── auth/
│   │
│   └── [tenant]/
│
├── components/
│
├── modules/
│   │
│   ├── auth/
│   ├── tenants/
│   ├── dashboard/
│   ├── orders/
│   ├── whatsapp/
│
├── lib/
│   │
│   ├── firebase-client.ts
│   ├── firebase-admin.ts
│
├── hooks/
│
├── store/
│
├── services/
│
├── types/
│
├── utils/
│
└── docs/
    │
    ├── architecture/
    ├── troubleshooting/
    ├── lessons-learned/
    └── journal/
```

---

# 3. Reglas absolutas

## Regla 1

Firebase Admin SOLO puede existir aquí:

```txt
src/lib/firebase-admin.ts
```

Uso permitido:

- API routes
- Webhooks
- Server actions
- Backend
- Middleware

Nunca:

- Client Components
- useEffect()
- Frontend

❌ Incorrecto:

```tsx
"use client"

import admin from "@/lib/firebase-admin"
```

---

## Regla 2

Firebase cliente SOLO aquí:

```txt
src/lib/firebase-client.ts
```

Uso permitido:

- login
- logout
- Firestore cliente
- Auth
- UI

Nunca:

- Webhooks
- Route handlers
- Middleware

---

## Regla 3

Nunca mezclar:

❌ Firebase Hosting

↓

❌ Functions Proxy

↓

❌ copiar carpeta .next

↓

❌ Next SSR

Esto rompe:

- Tailwind
- Assets
- Builds
- Deploy automático
- App Router

---

Arquitectura correcta:

```txt
GitHub

↓

Firebase App Hosting

↓

Next App Router

↓

Firestore
```

---

# 4. App Router Rules

Todas las páginas viven aquí:

```txt
src/app/
```

Ejemplos:

```txt
src/app/page.tsx

src/app/admin/page.tsx

src/app/[tenant]/page.tsx
```

API:

```txt
src/app/api/orders/route.ts
```

---

# 5. Componentes

Por defecto:

Todos son Server Components.

Solo usar:

```tsx
"use client"
```

cuando exista:

- useState
- useEffect
- eventos
- localStorage
- interacción visual

---

Incorrecto:

```tsx
"use client"

const data = await getData()
```

Correcto:

```tsx
async function Dashboard(){

const tenants=await getTenants()

return(
<div>
{tenants.map()}
</div>
)

}
```

---

# 6. Multi Tenant

Toda la aplicación gira alrededor de:

```txt
tenantId
```

Nunca:

```ts
orders
```

Siempre:

```ts
tenants/{tenantId}/orders
```

---

Incorrecto:

```ts
await addDoc(
collection(db,"orders")
)
```

Correcto:

```ts
await addDoc(
collection(
db,
"tenants",
tenantId,
"orders"
)
)
```

---

# 7. Webhook Gateway

Existe un único webhook público.

```txt
/api/webhook
```

Arquitectura:

```txt
Meta WhatsApp

↓

Webhook Gateway

↓

Router

├── Tenant A
├── Tenant B
└── Tenant N
```

Nunca:

```txt
Webhook por negocio
```

---

# 8. Roles

Roles oficiales:

```ts
type Role=

| "superadmin"
| "tenant_admin"
| "employee"
| "customer"
```

---

Permisos:

superadmin:

- crea tenants
- elimina tenants
- estadísticas globales

tenant_admin:

- administra negocio

employee:

- pedidos

customer:

- pedidos propios

---

# 9. Reglas Git

Aliases oficiales:

```bash
gs='git status'

ga='git add'

gc='git commit -m'

gp='git push origin main'

gl='git pull --rebase origin main'

gclean='rm -rf .next functions/.next functions/lib node_modules functions/node_modules'

gfix='git add next.config.js && git commit -m "fix: isolate next build from functions" && git push origin main'

gsync='git pull --rebase origin main && git push origin main'
```

---

# 10. Errores prohibidos

Nunca:

❌ SDK cliente dentro de backend

❌ Firebase Admin en frontend

❌ Copiar .next manualmente

❌ lógica enorme en page.tsx

❌ componentes gigantes

❌ código duplicado

❌ usar any

❌ guardar pedidos sin tenantId

❌ múltiples webhooks Meta

---

# 11. Principio de arquitectura

Si una solución parece un parche:

Detenerse.

Preguntar:

"¿Cómo lo haría oficialmente Next.js?"

Si existe una forma oficial:

Usarla.

Siempre.

---

Última actualización:

FoodSPV Architecture v1
