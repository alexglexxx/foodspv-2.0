import { Order } from "../types/order";
import { getPricingMode } from "../utils/pricing";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(amount);
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
  const fixedProductLines = order.productos.flatMap((producto) => {
    if (getPricingMode(producto) === "quote") {
      return [];
    }

    const optionLines = (producto.selectedOptions ?? []).map(
      (option) => `   * ${option.optionName}: ${option.valueLabels.join(", ")}`
    );

    return [
      `${producto.cantidad}x ${getProductEmoji(producto.nombre)} ${producto.nombre} - ${formatAmount((producto.precio ?? 0) * producto.cantidad)}`,
      ...optionLines,
    ];
  });
  const quoteProductLines = order.productos.flatMap((producto) => {
    if (getPricingMode(producto) !== "quote") {
      return [];
    }

    const optionLines = (producto.selectedOptions ?? []).map(
      (option) => `   * ${option.optionName}: ${option.valueLabels.join(", ")}`
    );

    return [
      `${producto.cantidad}x ${getProductEmoji(producto.nombre)} ${producto.nombre} - Por cotizar`,
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
    order.totalMode === "quote_only"
      ? "SOLICITUD DE COTIZACIÓN"
      : order.estado === "requires_confirmation"
      ? "PEDIDO GRANDE - REQUIERE CONFIRMACIÓN"
      : "NUEVA COMANDA";
  const totalLabel =
    order.totalMode === "partial_quote"
      ? "Total parcial"
      : "Total";
  const totalValue =
    order.totalMode === "quote_only"
      ? "Por cotizar"
      : formatAmount(order.total);

  return [
    header,
    "",
    `Cliente: ${order.customer?.nombre ?? order.cliente.nombre}`,
    `Teléfono: ${order.customer?.telefono ?? order.cliente.telefono}`,
    `Código cliente: ${formatCustomerCode(order.customer?.customerCode)}`,
    ...deliveryLines,
    "",
    ...(fixedProductLines.length > 0 ? ["CON PRECIO", ...fixedProductLines, ""] : []),
    ...(quoteProductLines.length > 0 ? ["POR COTIZAR", ...quoteProductLines, ""] : []),
    "",
    `${totalLabel}: ${totalValue}`,
    ...(order.hasQuoteItems
      ? [
          "",
          "Este pedido incluye productos por cotizar.",
          "Contactar al cliente para confirmar precio y detalles.",
        ]
      : []),
  ].join("\n");
}
