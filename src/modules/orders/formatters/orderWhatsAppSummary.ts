import type { RecentTenantOrderSummary } from "../server/listRecentTenantOrders";

function formatDate(value: Date | null): string {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatTotal(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Sin total";
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function summarizeProducts(order: RecentTenantOrderSummary): string {
  if (order.productos.length === 0) {
    return "Productos no disponibles";
  }

  return order.productos
    .slice(0, 3)
    .map((producto) => `${producto.cantidad}x ${producto.nombre}`)
    .join(", ");
}

function getShortOrderId(orderId: string): string {
  return orderId.length <= 6 ? orderId : orderId.slice(-6).toUpperCase();
}

export function formatRecentOrdersForWhatsApp(
  orders: RecentTenantOrderSummary[]
): string {
  if (orders.length === 0) {
    return [
      "No hay pedidos recientes guardados.",
      "",
      "Para ver más pedidos manda ULTIMOS 3",
    ].join("\n");
  }

  const lines = orders.flatMap((order, index) => [
    `${index + 1}. Pedido ${getShortOrderId(order.orderId)}`,
    `Fecha: ${formatDate(order.createdAt)}`,
    `Cliente: ${order.clienteNombre}`,
    `Teléfono: ${order.clienteTelefono}`,
    ...(order.customerCode ? [`Código cliente: ${order.customerCode}`] : []),
    `Productos: ${summarizeProducts(order)}`,
    `Total: ${formatTotal(order.total)}`,
    `Estado: ${order.estado}`,
    "",
  ]);

  return [
    "Pedidos recientes",
    "",
    ...lines,
    "Para ver más pedidos manda ULTIMOS 3",
  ].join("\n");
}
