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
  return [
    `Hola ${order.cliente.nombre} 👋`,
    "",
    `Tu pedido fue recibido por ${tenantName}.`,
    "",
    `Estará listo aproximadamente en ${estimatedPreparationMinutes} minutos para que pases a recoger.`,
    "",
    "Gracias por tu pedido.",
  ].join("\n");
}
