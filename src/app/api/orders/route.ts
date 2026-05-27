import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { customerConfirmationAgent } from "@/modules/orders/agents/customerConfirmationAgent";
import { firestoreWriterAgent } from "@/modules/orders/agents/firestoreWriterAgent";
import { orderValidatorAgent } from "@/modules/orders/agents/orderValidatorAgent";
import { tenantOrderFlowConfigAgent } from "@/modules/orders/agents/tenantOrderFlowConfigAgent";
import { whatsappComandaAgent } from "@/modules/orders/agents/whatsappComandaAgent";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";
import type { Order } from "@/modules/orders/types/order";

interface OrderConfirmationPolicyRecord {
  enabled?: unknown;
  amountThreshold?: unknown;
  action?: unknown;
}

interface TenantOrderConfirmationPolicyRecord {
  orderConfirmationPolicy?: unknown;
}

interface OrderConfirmationPolicy {
  enabled: boolean;
  amountThreshold: number;
  action: "allow" | "require_manual_confirmation";
}

const DEFAULT_ORDER_CONFIRMATION_POLICY: OrderConfirmationPolicy = {
  enabled: false,
  amountThreshold: 1,
  action: "allow",
};

function normalizeOrderConfirmationPolicy(
  value: unknown
): OrderConfirmationPolicy {
  if (!value || typeof value !== "object") {
    return DEFAULT_ORDER_CONFIRMATION_POLICY;
  }

  const record = value as OrderConfirmationPolicyRecord;
  const enabled = record.enabled === true;
  const amountThreshold =
    typeof record.amountThreshold === "number" &&
    Number.isFinite(record.amountThreshold) &&
    record.amountThreshold >= 1
      ? record.amountThreshold
      : DEFAULT_ORDER_CONFIRMATION_POLICY.amountThreshold;

  return {
    enabled,
    amountThreshold,
    action: enabled ? "require_manual_confirmation" : "allow",
  };
}

async function getOrderConfirmationPolicy(
  tenantId: string
): Promise<OrderConfirmationPolicy> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();
  const tenantRecord = (tenantSnapshot.data() ?? {}) as TenantOrderConfirmationPolicyRecord;

  return normalizeOrderConfirmationPolicy(tenantRecord.orderConfirmationPolicy);
}

function applyOrderConfirmationPolicy(
  order: Order,
  policy: OrderConfirmationPolicy
): { order: Order; requiresConfirmation: boolean } {
  const requiresConfirmation =
    policy.enabled &&
    policy.action === "require_manual_confirmation" &&
    order.total >= policy.amountThreshold;

  return {
    order: {
      ...order,
      estado: requiresConfirmation ? "requires_confirmation" : order.estado,
    },
    requiresConfirmation,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = orderValidatorAgent(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido inválido.",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const orderConfirmationPolicy = await getOrderConfirmationPolicy(
      validation.data.tenantId
    );
    const orderConfirmation = applyOrderConfirmationPolicy(
      validation.data,
      orderConfirmationPolicy
    );

    const persistedOrder = await firestoreWriterAgent(orderConfirmation.order);

    if (!persistedOrder.success) {
      return NextResponse.json(
        {
          success: false,
          message: persistedOrder.message,
        },
        { status: 500 }
      );
    }

    const tenantOrderFlow = await tenantOrderFlowConfigAgent(
      orderConfirmation.order.tenantId
    );
    const whatsappMessage = whatsappComandaAgent(orderConfirmation.order);
    const whatsappDelivery = await whatsappSenderAgent({
      tenantId: orderConfirmation.order.tenantId,
      whatsappMessage,
    });
    const shouldSendCustomerConfirmation =
      tenantOrderFlow.config.orderFlowMode === "simple_whatsapp" &&
      whatsappDelivery.success &&
      !orderConfirmation.requiresConfirmation;
    const customerConfirmationMessage = shouldSendCustomerConfirmation
      ? customerConfirmationAgent({
          order: orderConfirmation.order,
          tenantName: tenantOrderFlow.tenantName,
          estimatedPreparationMinutes:
            tenantOrderFlow.config.estimatedPreparationMinutes,
        })
      : null;
    const customerConfirmationDelivery = customerConfirmationMessage
      ? await whatsappSenderAgent({
          tenantId: orderConfirmation.order.tenantId,
          whatsappMessage: customerConfirmationMessage,
          recipientPhone: orderConfirmation.order.cliente.telefono,
        })
      : null;
    const deliveredCustomerConfirmation =
      customerConfirmationDelivery?.success ?? false;
    const message = !whatsappDelivery.success
      ? "Pedido guardado correctamente, pero falló el envío por WhatsApp."
      : shouldSendCustomerConfirmation
        ? deliveredCustomerConfirmation
          ? "Pedido guardado, enviado al negocio y confirmado al cliente por WhatsApp."
          : "Pedido guardado y enviado al negocio por WhatsApp, pero falló la confirmación al cliente."
        : "Pedido guardado y enviado por WhatsApp correctamente.";

    return NextResponse.json(
      {
        success: true,
        message,
        orderId: persistedOrder.orderId,
        order: orderConfirmation.order,
        requiresConfirmation: orderConfirmation.requiresConfirmation,
        tenantOrderFlow,
        whatsappMessage,
        whatsappDelivery,
        customerConfirmationMessage,
        customerConfirmationDelivery,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error procesando pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno procesando pedido.",
      },
      { status: 500 }
    );
  }
}
