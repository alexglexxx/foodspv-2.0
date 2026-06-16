# Troubleshooting: Product Options Not Visible

Si los modificadores o sabores (Product Options) no aparecen en la Webapp pública para un producto específico, sigue este checklist para diagnosticar el problema.

## Causa Posible

El producto puede tener opciones configuradas en Firestore, pero la Webapp solo abre el modal si encuentra opciones con valores activos. Si los valores están inactivos, el formato no es válido, el producto no se recargó o la tarjeta agrega directo al carrito, las opciones no serán visibles.

## Checklist de Resolución

1. **¿El producto tiene opciones?**
   - Verifica en el Superadmin que el producto tenga al menos una opción agregada en la sección "Opciones y modificadores".

2. **¿Los valores están activos?**
   - Asegúrate de que los valores dentro de la opción (ej. Sprite, Fanta, Coca-Cola) tengan el switch de "Activo" encendido. Si una opción no tiene ningún valor activo, se filtrará automáticamente.

3. **¿Es una opción requerida?**
   - Si `required` es `true`, el usuario no podrá agregar el producto al carrito sin seleccionar al menos un valor. Si el modal público no bloquea, revisa que `required` esté marcado correctamente.

4. **¿La Webapp usa el modal correcto?**
   - La Webapp pública debe abrir el `ProductOptionsModal` (o similar) al intentar agregar el producto. Si se agrega directamente al carrito, significa que la Webapp no detectó opciones activas.

5. **Payload de Checkout**
   - Al finalizar el pedido, asegúrate de que el payload envíe el arreglo `selectedOptions` con los IDs de las opciones seleccionadas. El backend (`orderService`) recalculará el total basado en estos valores.

6. **Backend y WhatsApp**
   - Si el carrito muestra opciones pero WhatsApp no, revisa que `/api/orders` devuelva `order.productos[].selectedOptions` y `whatsappMessage`.
   - La comanda debe imprimir líneas como `- Sabor: Sprite` debajo del producto.

7. **Bebidas de prueba**
   - `Refresco 600ml`: opción `Sabor`, tipo `single`, `required = true`, valores activos.
   - `Agua fresca`: opción `Sabor`, tipo `single`, `required = true`, valores activos.
   - `Taco Pastor`: modificador opcional si existe; no debe bloquear agregar al carrito cuando `required = false`.
