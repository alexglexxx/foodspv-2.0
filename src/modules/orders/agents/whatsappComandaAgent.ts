import { Order } from "../types/order";

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function whatsappComandaAgent(order: Order): string {
  const productLines = order.productos.map((producto, index) => {
    return `${index + 1}. ${producto.cantidad} x ${producto.nombre}`;
  });

  return [
    "NUEVA COMANDA",
    "",
    `Nombre: ${order.cliente.nombre}`,
    `Telefono: ${order.cliente.telefono}`,
    "",
    "PRODUCTOS",
    ...productLines,
    "",
    `Total: ${formatAmount(order.total)}`,
  ].join("\n");
}
