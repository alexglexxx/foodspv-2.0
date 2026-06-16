# Tenant visual presets

FoodSPV ya no permite editar colores libres por tenant. La apariencia publica se controla con tres presets visuales globales, profesionales y testeables: `fresh`, `dark-premium` y `modern`.

## Por que eliminamos el editor de colores

El editor libre hacia facil crear combinaciones inconsistentes, bajo contraste y experiencias dificiles de mantener. Los tenants ahora comparten un sistema visual cerrado: el superadmin elige un preset y el codigo aplica tokens controlados para fondo, hero, cards, botones, bordes, sombras y texto.

## Modelo

El documento `tenants/{tenantId}` guarda:

- `visualPresetId: "fresh" | "dark-premium" | "modern"`

`designPresetId` puede seguir existiendo como dato legacy en Firestore, pero ya no es la fuente principal ni aparece en la UI nueva.

La resolucion es:

1. Si `tenant.visualPresetId` existe y es valido, se usa ese preset.
2. Si no existe o no es valido, se normaliza a `fresh`.
3. No se guardan colores sueltos como `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `cardColor`, `textColor` o `buttonTextColor`.

## Presets disponibles

- `fresh`: claro, verde, tipo app de delivery moderna. Ideal para comida fresca y operacion rapida.
- `dark-premium`: oscuro, naranja, fotografico y nocturno. Ideal para burgers, grill, steakhouse y restaurantes premium.
- `modern`: claro, azul, minimalista y limpio. Ideal para cafeterias, comida rapida moderna y marcas sobrias.

Los tokens viven en `src/modules/design/tenantVisualPresets.ts` y se aplican en la webapp publica como CSS variables:

- `--tenant-primary`
- `--tenant-secondary`
- `--tenant-accent`
- `--tenant-bg`
- `--tenant-surface`
- `--tenant-card`
- `--tenant-text`
- `--tenant-muted`
- `--tenant-button-text`
- `--tenant-border`
- `--tenant-hero-overlay`
- `--tenant-radius`
- `--tenant-card-shadow`

## Como agregar un cuarto preset

1. Agregar el nuevo id al tipo `TenantVisualPresetId`.
2. Agregar el objeto completo a `VISUAL_PRESETS`.
3. Definir todos los tokens de `colors` y `layout`.
4. Confirmar que `isValidVisualPresetId` lo acepta automaticamente.
5. Probar el preset en `/superadmin` y en la pagina publica del tenant.

No se debe agregar un editor libre de colores para cubrir casos especiales.

## Prueba visual

1. Entrar a `/superadmin`.
2. Editar un tenant, por ejemplo `tacos-juan`.
3. En `Apariencia visual`, seleccionar `Fresh`, guardar y abrir `/{tenant}`.
4. Confirmar fondo claro, cards blancas y botones verdes.
5. Cambiar a `Dark Premium`, guardar y refrescar `/{tenant}`.
6. Confirmar fondo oscuro, cards oscuras y botones naranja.
7. Cambiar a `Modern`, guardar y refrescar `/{tenant}`.
8. Confirmar look claro, minimalista y botones azules.
9. Confirmar que no existen inputs manuales de color.
