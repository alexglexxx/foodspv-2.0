# FoodSPV 2.0 — End-to-End MVP Checklist

Objetivo: validar el flujo completo del MVP antes de un deploy real, sin cambiar lógica funcional.

Ambiente sugerido:

- URL pública o local de la app con `tenantId`
- Tenant de prueba activo en Firestore
- Productos cargados en `tenants/{tenantId}/products`
- Configuración WhatsApp completa en el documento `tenants/{tenantId}`
- Acceso al dashboard `/admin?tenantId={tenantId}`

Datos mínimos del tenant:

- `active`
- `whatsappPhone`
- `metaPhoneNumberId`
- `metaAccessToken`
- `orderFlowMode`
- `estimatedPreparationMinutes`

Variables de entorno mínimas:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID` o `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `META_WEBHOOK_VERIFY_TOKEN`

## FASE 1 — Menú y carrito

- [ ] Abrir QR o URL con `tenantId`
- [ ] Cargar productos desde Firestore
- [ ] Agregar productos al carrito
- [ ] Calcular total correctamente
- [ ] Abrir `CustomerInfoModal`
- [ ] Validar nombre mínimo 4 caracteres
- [ ] Validar teléfono con 10 dígitos reales

## FASE 2 — Pedido

- [ ] `POST /api/orders` exitoso
- [ ] Validator Agent correcto
- [ ] Firestore Writer correcto
- [ ] Pedido creado en:

```txt
tenants/{tenantId}/orders
```

## FASE 3 — WhatsApp negocio

- [ ] Comanda enviada
- [ ] Formato correcto
- [ ] Datos cliente correctos

## FASE 4 — Cliente

### `simple_whatsapp`

- [ ] Confirmación automática enviada
- [ ] Tiempo estimado correcto

### `dashboard_managed`

- [ ] Pedido visible en dashboard
- [ ] Cambio de estado funciona
- [ ] Notificación automática funciona

## FASE 5 — Deploy

- [ ] Variables entorno presentes
- [ ] Firebase Admin
- [ ] Meta Token
- [ ] Meta Phone Number ID
- [ ] Webhook Verify Token
- [ ] Build OK
- [ ] Lint OK
- [ ] TypeScript OK

## Criterio de salida

El MVP queda listo para deploy real solo si todas las fases anteriores pasan en un tenant de prueba con datos reales de Firestore y credenciales WhatsApp válidas.
