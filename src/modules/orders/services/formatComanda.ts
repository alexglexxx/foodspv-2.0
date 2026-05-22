import { Order } from "@/types/order.types";

export function formatComanda(order: Order): string {
  const items = order.items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.productName}
💵 ${item.unitPrice}`
    )
    .join("\n");

  return `
🌮 NUEVO PEDIDO

👤 ${order.customerName}
📞 ${order.customerPhone}

🧾 Pedido:
${items}

💰 Total: $${order.total}
`;
}
