import type { Order } from "../types/order";
import type { TenantOrderFlowConfig } from "@/types/tenant.types";

interface CreateOrderResponseBody {
  success?: boolean;
  message?: string;
  orderId?: string;
  errors?: string[];
  tenantOrderFlow?: {
    config?: TenantOrderFlowConfig;
    source?: "tenant" | "default";
  };
}

function toTenantOrderFlow(
  value: CreateOrderResponseBody["tenantOrderFlow"]
):
  | {
      config: TenantOrderFlowConfig;
      source: "tenant" | "default";
    }
  | undefined {
  if (!value?.config || !value.source) {
    return undefined;
  }

  return {
    config: value.config,
    source: value.source,
  };
}

export type CreateOrderResult =
  | {
      success: true;
      message: string;
      orderId: string;
      tenantOrderFlow?: {
        config: TenantOrderFlowConfig;
        source: "tenant" | "default";
      };
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
      tenantOrderFlow: toTenantOrderFlow(payload.tenantOrderFlow),
    };
  }

  return {
    success: false,
    message: payload.message ?? "No se pudo generar el pedido.",
    errors: Array.isArray(payload.errors) ? payload.errors : [],
  };
}
