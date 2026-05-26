## TASK-009

Estado: COMPLETE

Resultado:

- Flujo de pedido conectado desde `OrderMenuClient` hacia `POST /api/orders`
- Modal `CustomerInfoModal` separado con nombre y teléfono obligatorios
- Validaciones cliente: nombre mínimo 4 caracteres y teléfono mínimo 10 dígitos reales
- Estados UI cubiertos: envío en progreso, éxito y error

## TASK-008

Estado: COMPLETE

Resultado:

- Menú dinámico leyendo productos desde `tenants/{tenantId}/products`
- Componentes separados para tarjeta de producto, drawer de carrito y resumen
- Carrito conectado con recálculo de total y borrador local de pedido
