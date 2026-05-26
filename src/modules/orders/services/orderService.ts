import type { Order } from "../types/order";

interface CreateOrderResponseBody {
  success?: boolean;
  message?: string;
  orderId?: string;
  errors?: string[];
}

export type CreateOrderResult =
  | {
      success: true;
      message: string;
      orderId: string;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

export async function createOrder(order: Order): Promise<CreateOrderResult> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  const payload = (await response.json()) as CreateOrderResponseBody;

  if (response.ok && payload.success && typeof payload.orderId === "string") {
    return {
      success: true,
      message: payload.message ?? "Pedido generado correctamente.",
      orderId: payload.orderId,
    };
  }

  return {
    success: false,
    message: payload.message ?? "No se pudo generar el pedido.",
    errors: Array.isArray(payload.errors) ? payload.errors : [],
  };
}
