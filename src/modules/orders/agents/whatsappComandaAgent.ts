import { Order } from "../types/order";

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatCustomerCode(customerCode: string | undefined): string {
  if (!customerCode) {
    return "No asignado";
  }

  return customerCode;
}

function getProductEmoji(productName: string): string {
  const normalizedName = productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalizedName.includes("refresco")) {
    return "🥤";
  }

  if (normalizedName.includes("agua fresca")) {
    return "🥛";
  }

  if (normalizedName.includes("taco")) {
    return "🌮";
  }

  return "🍽️";
}

export function whatsappComandaAgent(order: Order): string {
  const productLines = order.productos.flatMap((producto, index) => {
    const optionLines = (producto.selectedOptions ?? []).map(
      (option) => `   * ${option.optionName}: ${option.valueLabels.join(", ")}`
    );

    return [
      `${index + 1}. ${producto.cantidad} x ${getProductEmoji(producto.nombre)} ${producto.nombre}`,
      ...optionLines,
    ];
  });
  const isDelivery = order.deliveryType === "delivery";
  const deliveryLines = isDelivery
    ? order.deliveryAddressDetails
      ? [
          "ENTREGA A DOMICILIO",
          `Calle: ${order.deliveryAddressDetails.street}`,
          `Número: ${order.deliveryAddressDetails.number}`,
          `Colonia: ${order.deliveryAddressDetails.neighborhood}`,
          `Referencia: ${order.deliveryAddressDetails.reference}`,
          `Costo envio: ${formatAmount(order.deliveryFee ?? 0)}`,
        ]
      : [
          "ENTREGA A DOMICILIO",
          `Direccion: ${order.deliveryAddress ?? ""}`,
          `Costo envio: ${formatAmount(order.deliveryFee ?? 0)}`,
        ]
    : ["RECOGER PEDIDO"];
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
