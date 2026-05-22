import { Order } from "@/types/order.types";

function formatCurrencyMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function formatTimeMX(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(date);
}

export function formatComanda(order: Order): string {
  const itemsText = order.items
    .map((item) => {
      const subtotal = item.quantity * item.unitPrice;

      const notes = item.notes?.trim()
        ? `\n   📝 ${item.notes.trim()}`
        : "";

      return `• ${item.quantity} × ${item.productName}${notes}
   💵 ${formatCurrencyMXN(item.unitPrice)} c/u
   💰 Subtotal: ${formatCurrencyMXN(subtotal)}`;
    })
    .join("\n\n");

  return `🌮 NUEVO PEDIDO — FOODSPV

👤 Cliente: ${order.customerName}
📞 Tel: ${order.customerPhone}

🧾 Pedido:

${itemsText}

━━━━━━━━━━━━━━━

💰 TOTAL: ${formatCurrencyMXN(order.total)}
🕒 Hora: ${formatTimeMX(order.createdAt)}

✅ Respuesta sugerida:
Hola ${order.customerName} 👋
Recibimos tu pedido.
En breve te confirmamos el tiempo de preparación.`;
}
