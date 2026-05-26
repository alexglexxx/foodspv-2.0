import type { Order, OrderState } from "../types/order";

interface CustomerStatusNotificationInput {
  order: Pick<Order, "cliente">;
  nextState: OrderState;
}

const CUSTOMER_STATUS_MESSAGES: Partial<
  Record<OrderState, (customerName: string) => string>
> = {
  preparando: (customerName) =>
    [`Hola ${customerName} 👋`, "Tu pedido ya está en preparación."].join("\n"),
  listo: (customerName) =>
    [`Hola ${customerName} 👋`, "Tu pedido ya está listo para recoger."].join(
      "\n"
    ),
  entregado: (customerName) => `Gracias por tu compra ${customerName} 👋`,
  cancelado: (customerName) =>
    `Hola ${customerName}. Tu pedido fue cancelado. Si tienes dudas contacta al negocio.`,
};

export function customerStatusNotificationAgent({
  order,
  nextState,
}: CustomerStatusNotificationInput): string | null {
  const createMessage = CUSTOMER_STATUS_MESSAGES[nextState];

  if (!createMessage) {
    return null;
  }

  return createMessage(order.cliente.nombre);
}
