# Tenant design presets

> Legacy/deprecated: este documento describe el sistema anterior de `designPresetId` por categoria. La arquitectura activa esta en `docs/architecture/tenant-visual-presets.md` y usa `visualPresetId` con tres presets globales.

FoodSPV usaba presets visuales por categoria en vez de permitir edicion libre de colores.

La decision evita combinaciones con bajo contraste, marcas visualmente inconsistentes y configuraciones dificiles de soportar desde superadmin. El tenant guarda solo `category` y `designPresetId`; los colores reales viven en `src/modules/design/tenantDesignPresets.ts`.

## Modelo

Cada preset define tokens profesionales:

- colores principales, secundarios, acento, fondo, superficies, tarjetas y texto
- texto de boton
- overlay del hero
- radio visual (`soft`, `medium`, `large`)
- mood tipografico (`classic`, `modern`, `warm`, `premium`)

Si un tenant no tiene `designPresetId`, se usa el primer preset de su categoria. Si la categoria no existe o viene con un valor antiguo, `normalizeTenantCategory` la resuelve a una categoria soportada o a `generico`.

## Como agregar presets

1. Abrir `src/modules/design/tenantDesignPresets.ts`.
2. Agregar el preset en `DESIGN_PRESETS_BY_CATEGORY[category]`.
3. Usar un `id` estable, unico y descriptivo.
4. Mantener minimo tres presets por categoria.
5. Validar que el contraste entre `primaryColor`, `buttonTextColor`, `backgroundColor`, `surfaceColor` y `textColor` sea legible.

No se debe guardar color libre en Firestore. El superadmin solo selecciona `designPresetId`.

## Aplicacion publica

La webapp publica resuelve:

1. `tenant.category`
2. `tenant.designPresetId`
3. `getPresetForTenant(category, designPresetId)`

Luego aplica CSS variables en `OrderMenuClient`, por ejemplo:

- `--tenant-primary`
- `--tenant-secondary`
- `--tenant-accent`
- `--tenant-bg`
- `--tenant-surface`
- `--tenant-card`
- `--tenant-text`
- `--tenant-muted`
- `--tenant-button-text`
- `--tenant-hero-overlay`

Los componentes publicos usan esas variables para mantener el layout actual, pero permitir que el negocio cambie de apariencia al seleccionar otro preset.
