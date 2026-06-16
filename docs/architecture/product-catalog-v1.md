# Product Catalog v1

FoodSPV 2.0 maneja el catálogo desde Firestore y conserva compatibilidad con productos antiguos que solo tienen `imageUrl`.

## Soft Delete Strategy

Los productos no se borran físicamente. Al eliminar desde admin/superadmin:
- `active = false`
- `available = false`
- `deletedAt = FieldValue.serverTimestamp()`

Esto mantiene intactos los pedidos históricos porque cada orden guarda el snapshot del producto pedido y sus `selectedOptions`.

Filtros:
- Admin/superadmin lista productos no eliminados; los inactivos siguen visibles para editarse.
- Webapp pública ignora productos con `active === false` o `deletedAt`.
- Checkout/backend vuelve a validar contra catálogo y rechaza productos eliminados o no disponibles.

## Product Actions

Admin/superadmin soporta acciones completas sin tocar Firestore manualmente:
- Editar: abre el formulario completo de producto.
- Duplicar: crea una copia con nombre `Producto (Copia)` y conserva categoría, precio, `imageUrl`, `images[]`, opciones y estado.
- Activar/desactivar: cambia `active`; si queda inactivo, también queda fuera de venta pública.
- Eliminar: aplica soft delete y desaparece de admin/webapp sin borrar pedidos históricos.

## Image Handling: Legacy `imageUrl` vs `images[]`

Modelo nuevo:

```ts
ProductImage {
  id: string
  url: string
  alt?: string
  label?: string
  sortOrder: number
  isPrimary?: boolean
}
```

Reglas:
- Si `images[]` tiene imágenes válidas, se usa como galería.
- Si `images[]` está vacío, la webapp usa `imageUrl` como imagen legacy.
- Máximo 5 imágenes válidas.
- Solo una imagen queda como primaria.
- Productos viejos con `imageUrl` siguen funcionando sin migración.

**Lightbox:**
La tarjeta pública muestra la imagen primaria. Si hay varias imágenes, muestra contador `n/total`. Al tocar la imagen abre `ProductLightbox`, un popup responsive con fondo oscuro, botón X, navegación izquierda/derecha y cierre por Escape/fondo.

## Product Options Engine

Las opciones de producto cubren sabores, modificadores, tamaños y color:
- Opciones `required` bloquean agregar al carrito hasta seleccionar.
- `single` permite un valor; `multiple` permite varios.
- El carrito muestra `optionName: valueLabels`.
- Checkout envía `selectedOptions`.
- Backend recalcula precio usando catálogo vigente y valida IDs activos.
- WhatsApp/comanda imprime cada opción seleccionada debajo del producto.

## Selectable Color / Variants (Phase 1)

Para color seleccionable se usa una `ProductOption`:
- Nombre: `Color`
- Tipo: `single`
- Valores: `Rojo`, `Azul`, `Negro`
- `required` depende del producto; para un producto de color obligatorio debe ir en `true`.

`ProductOptionValue.imageUrl` todavía no existe en el modelo, así que el cambio de imagen por color queda como fase 2.

## Cómo Probar Bebidas

1. En admin/superadmin abre `Refresco 600ml`.
2. Verifica opción `Sabor`, tipo `single`, `required = true`.
3. Verifica valores activos como `Sprite`, `Fanta`, `Coca-Cola`.
4. Abre la webapp pública del tenant.
5. Presiona `Agregar` en `Refresco 600ml`; debe abrir el modal de opciones.
6. Sin elegir sabor, el botón `Agregar` debe estar bloqueado.
7. Elige `Sprite` y agrega al carrito.
8. El carrito debe mostrar `Sabor: Sprite`.
9. Haz checkout y confirma que el payload y la comanda WhatsApp incluyen `Sabor: Sprite`.
10. Repite con `Agua fresca` y sus sabores obligatorios.
