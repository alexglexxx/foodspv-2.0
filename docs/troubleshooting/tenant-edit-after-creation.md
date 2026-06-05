# Tenant edit after creation

## Problema detectado

Los tenants creados desde `/superadmin` quedaban casi congelados despues del alta. El superadmin podia verlos y administrar productos, pero no habia un flujo completo y seguro para editar datos publicos, WhatsApp, modo de pedidos, entrega a domicilio y apariencia visual.

## Causa raiz

La ruta individual de superadmin solo cubria mutaciones parciales limitadas y no exponia `GET` normalizado. La edicion reutilizaba validaciones de alta, por lo que tenants existentes con configuracion incompleta de Meta podian bloquear cambios publicos no relacionados.

Ademas, el modelo de entrega seguia usando campos legacy planos (`deliveryEnabled`, `deliveryFee`) y no un objeto extensible para pedido minimo o notas.

## Solucion implementada

- `GET /api/superadmin/tenants/[tenantId]` devuelve el tenant normalizado y `availableDesignPresets`.
- `PATCH /api/superadmin/tenants/[tenantId]` acepta updates parciales validados.
- Se bloquean campos peligrosos como `createdAt`, `deletedAt`, `stats`, ids internos, `publicUrl`, `qrCode` y `tenantTheme`.
- `deliveryConfig` es el nuevo contrato de entrega, con fallback a `deliveryEnabled/deliveryFee`.
- La UI de `/superadmin` permite editar negocio, seleccionar preset por categoria, configurar pedidos y entrega.
- La webapp publica aplica el preset con CSS variables y conserva fallback para tenants viejos.

## Verificar tacos-juan

1. Entrar a `/superadmin`.
2. Buscar `tacos-juan`.
3. Abrir `Editar negocio`.
4. Cambiar el preset a `tacos-nocturno`.
5. Guardar cambios.
6. Abrir `/tacos-juan`.
7. Confirmar que el diseno cambio.
8. Cambiar descripcion o saludo.
9. Guardar cambios.
10. Refrescar `/tacos-juan`.
11. Confirmar persistencia.
12. Probar por API que un `designPresetId` invalido para la categoria responde 400 y no se guarda.
