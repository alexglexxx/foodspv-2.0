import { Order } from "../types/order";

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function whatsappComandaAgent(order: Order): string {
  const productLines = order.productos.map((producto, index) => {
    return `${index + 1}. ${producto.cantidad} x ${producto.nombre}`;
  });
  const isDelivery = order.deliveryType === "delivery";
  const deliveryLines = isDelivery
    ? [
        "Entrega: A domicilio",
        `Direccion: ${order.deliveryAddress ?? ""}`,
        `Costo envio: ${formatAmount(order.deliveryFee ?? 0)}`,
      ]
    : ["Entrega: Recoger pedido"];
  const header =
    order.estado === "requires_confirmation"
      ? "PEDIDO GRANDE - REQUIERE CONFIRMACIÓN"
      : "NUEVA COMANDA";

  return [
    header,
    "",
    `Nombre: ${order.cliente.nombre}`,
    `Telefono: ${order.cliente.telefono}`,
    ...deliveryLines,
    "",
    "PRODUCTOS",
    ...productLines,
    "",
    `Total: ${formatAmount(order.total)}`,
  ].join("\n");
}
