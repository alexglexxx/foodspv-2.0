import type { Order } from "../types/order";

interface CustomerConfirmationInput {
  order: Order;
  tenantName: string;
  estimatedPreparationMinutes: number;
}

export function customerConfirmationAgent({
  order,
  tenantName,
  estimatedPreparationMinutes,
}: CustomerConfirmationInput): string {
  const deliveryMessage =
    order.deliveryType === "delivery"
      ? "Tu pedido será enviado a la dirección indicada."
      : `Estará listo aproximadamente en ${estimatedPreparationMinutes} minutos para que pases a recoger.`;

  return [
    `Hola ${order.cliente.nombre} 👋`,
    "",
    `Tu pedido fue recibido por ${tenantName}.`,
    "",
    deliveryMessage,
    "",
    "Gracias por tu pedido.",
  ].join("\n");
}
