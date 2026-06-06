import { Order } from "../types/order";

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatCustomerCode(customerCode: string | undefined): string {
  if (!customerCode) {
    return "No asignado";
  }

  const [prefix, digits] = customerCode.split("-");

  if (!digits) {
    return customerCode;
  }

  const digitBlocks = digits.match(/.{1,3}/g)?.join(" ") ?? digits;

  return `${prefix} ${digitBlocks}`;
}

export function whatsappComandaAgent(order: Order): string {
  const productLines = order.productos.flatMap((producto, index) => {
    const optionLines = (producto.selectedOptions ?? []).map(
      (option) => `   - ${option.optionName}: ${option.valueLabels.join(", ")}`
    );

    return [`${index + 1}. ${producto.cantidad} x ${producto.nombre}`, ...optionLines];
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
    `Cliente: ${order.customer?.nombre ?? order.cliente.nombre}`,
    `Teléfono: ${order.customer?.telefono ?? order.cliente.telefono}`,
    `Código cliente: ${formatCustomerCode(order.customer?.customerCode)}`,
    ...deliveryLines,
    "",
    "PRODUCTOS",
    ...productLines,
    "",
    `Total: ${formatAmount(order.total)}`,
  ].join("\n");
}
