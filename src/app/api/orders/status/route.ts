import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  canTransitionOrderState,
  isOrderState,
} from "@/modules/orders/agents/orderStateAgent";
import { customerStatusNotificationAgent } from "@/modules/orders/agents/customerStatusNotificationAgent";
import { tenantOrderFlowConfigAgent } from "@/modules/orders/agents/tenantOrderFlowConfigAgent";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";
import type { CustomerInfo, Order, OrderItem, OrderState } from "@/modules/orders/types/order";

interface StatusUpdateRequest {
  tenantId: string;
  orderId: string;
  nextState: OrderState;
}

interface OrderStateRecord {
  tenantId?: unknown;
  cliente?: {
    nombre?: unknown;
    telefono?: unknown;
  };
  productos?: unknown;
  total?: unknown;
  estado?: unknown;
}

type StatusUpdateTransactionResult =
  | {
      changed: true;
      order: Order;
      previousState: OrderState;
      nextState: OrderState;
    }
  | {
      changed: false;
      state: OrderState;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseStatusUpdateRequest(value: unknown): StatusUpdateRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as {
    tenantId?: unknown;
    orderId?: unknown;
    nextState?: unknown;
  };

  if (
    !isNonEmptyString(record.tenantId) ||
    !isNonEmptyString(record.orderId) ||
    !isOrderState(record.nextState)
  ) {
    return null;
  }

  return {
    tenantId: record.tenantId.trim(),
    orderId: record.orderId.trim(),
    nextState: record.nextState,
  };
}

function mapCustomer(value: OrderStateRecord["cliente"]): CustomerInfo | null {
  if (
    !value ||
    !isNonEmptyString(value.nombre) ||
    !isNonEmptyString(value.telefono)
  ) {
    return null;
  }

  return {
    nombre: value.nombre.trim(),
    telefono: value.telefono.trim(),
  };
}

function mapOrderItems(value: unknown): OrderItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: OrderItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as {
      id?: unknown;
      nombre?: unknown;
      precio?: unknown;
      cantidad?: unknown;
    };

    if (
      !isNonEmptyString(record.id) ||
      !isNonEmptyString(record.nombre) ||
      !isValidNumber(record.precio) ||
      !isValidNumber(record.cantidad)
    ) {
      return null;
    }

    items.push({
      id: record.id.trim(),
      nombre: record.nombre.trim(),
      precio: record.precio,
      cantidad: record.cantidad,
    });
  }

  return items;
}

function mapOrderRecord(
  tenantId: string,
  record: OrderStateRecord,
  estado: OrderState
): Order | null {
  const cliente = mapCustomer(record.cliente);
  const productos = mapOrderItems(record.productos);

  if (
    !cliente ||
    !productos ||
    !isValidNumber(record.total) ||
    !isNonEmptyString(record.tenantId) ||
    record.tenantId.trim() !== tenantId
  ) {
    return null;
  }

  return {
    tenantId,
    cliente,
    productos,
    total: record.total,
    estado,
    createdAt: 0,
  };
}

function getStatusErrorMessage(error: Error): string {
  switch (error.message) {
    case "ORDER_NOT_FOUND":
      return "El pedido ya no existe en Firestore.";
    case "INVALID_CURRENT_STATE":
      return "El pedido tiene un estado inválido y no se puede actualizar.";
    case "INVALID_ORDER_DATA":
      return "El pedido no tiene datos válidos para notificar al cliente.";
    case "INVALID_TRANSITION":
      return "La transición solicitada no es válida para el estado actual.";
    default:
      return error.message;
  }
}

export async function PATCH(request: Request) {
  try {
    const input = parseStatusUpdateRequest(await request.json());

    if (!input) {
      return NextResponse.json(
        {
          success: false,
          message: "tenantId, orderId y nextState válido son obligatorios.",
        },
        { status: 400 }
      );
    }

    const tenantOrderFlow = await tenantOrderFlowConfigAgent(input.tenantId);

    if (tenantOrderFlow.config.orderFlowMode !== "dashboard_managed") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Las actualizaciones de estado solo aplican para dashboard_managed.",
        },
        { status: 409 }
      );
    }

    const orderRef = adminDb
      .collection("tenants")
      .doc(input.tenantId)
      .collection("orders")
      .doc(input.orderId);

    const transactionResult = await adminDb.runTransaction(
      async (transaction): Promise<StatusUpdateTransactionResult> => {
        const orderSnapshot = await transaction.get(orderRef);

        if (!orderSnapshot.exists) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const orderData = (orderSnapshot.data() ?? {}) as OrderStateRecord;

        if (!isOrderState(orderData.estado)) {
          throw new Error("INVALID_CURRENT_STATE");
        }

        if (orderData.estado === input.nextState) {
          return {
            changed: false,
            state: orderData.estado,
          };
        }

        if (!canTransitionOrderState(orderData.estado, input.nextState)) {
          throw new Error("INVALID_TRANSITION");
        }

        const order = mapOrderRecord(input.tenantId, orderData, input.nextState);

        if (!order) {
          throw new Error("INVALID_ORDER_DATA");
        }

        transaction.update(orderRef, {
          estado: input.nextState,
          updatedAt: FieldValue.serverTimestamp(),
          statusUpdatedAt: FieldValue.serverTimestamp(),
        });

        return {
          changed: true,
          order,
          previousState: orderData.estado,
          nextState: input.nextState,
        };
      }
    );

    if (!transactionResult.changed) {
      return NextResponse.json({
        success: true,
        changed: false,
        state: transactionResult.state,
        customerStatusNotificationMessage: null,
        customerStatusNotificationDelivery: null,
      });
    }

    const customerStatusNotificationMessage = customerStatusNotificationAgent({
      order: transactionResult.order,
      nextState: transactionResult.nextState,
    });
    const customerStatusNotificationDelivery =
      customerStatusNotificationMessage === null
        ? null
        : await whatsappSenderAgent({
            tenantId: input.tenantId,
            whatsappMessage: customerStatusNotificationMessage,
            recipientPhone: transactionResult.order.cliente.telefono,
          });

    return NextResponse.json({
      success: true,
      changed: true,
      previousState: transactionResult.previousState,
      state: transactionResult.nextState,
      customerStatusNotificationMessage,
      customerStatusNotificationDelivery,
    });
  } catch (error) {
    console.error("Error actualizando estado de pedido:", error);

    const message =
      error instanceof Error
        ? getStatusErrorMessage(error)
        : "No se pudo actualizar el estado del pedido.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
