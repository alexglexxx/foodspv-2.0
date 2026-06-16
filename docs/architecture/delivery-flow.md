# Delivery Flow

FoodSPV soporta pickup y entrega a domicilio por tenant.

## Configuración

El tenant configura:

```ts
deliveryConfig {
  enabled: boolean
  fee?: number
  minimumOrder?: number
  notes?: string
}
```

La webapp conserva fallback a `deliveryEnabled` y `deliveryFee` para tenants existentes.

## Pickup

Si el cliente elige recoger:
- `deliveryType = "pickup"`
- No se guarda dirección.
- WhatsApp muestra `RECOGER PEDIDO`.
- Dashboard muestra `🏪 Recoger pedido`.

## Delivery

Si el cliente elige entrega a domicilio:
- `deliveryType = "delivery"`
- Se suma `deliveryFee`.
- Se valida `minimumOrder`.
- Se requieren calle, número, colonia y referencia.

El pedido guarda:

```ts
deliveryAddress: string
deliveryAddressDetails {
  street: string
  number: string
  neighborhood: string
  reference: string
}
```

`deliveryAddress` es un resumen legacy para compatibilidad. `deliveryAddressDetails` es el contrato nuevo para operación.

## WhatsApp

La comanda imprime:

```txt
ENTREGA A DOMICILIO
Calle:
Número:
Colonia:
Referencia:
Costo envio:
```

Si una orden vieja solo tiene `deliveryAddress`, WhatsApp usa ese texto como fallback.

## Dashboard

El dashboard muestra claramente:
- `📍 Entrega a domicilio`
- `🏪 Recoger pedido`

Cuando hay `deliveryAddressDetails`, muestra los campos separados. Si no existen, muestra el resumen `deliveryAddress`.
