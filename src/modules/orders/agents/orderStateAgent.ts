import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

import type { OrderState } from "../types/order";

const ORDER_STATE_LABELS: Record<OrderState, string> = {
  pendiente: "Pendiente",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ORDER_STATE_TRANSITIONS: Record<OrderState, OrderState[]> = {
  pendiente: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["entregado"],
  entregado: [],
  cancelado: [],
};

interface OrderStateRecord {
  estado?: unknown;
}

interface UpdateOrderStateInput {
  tenantId: string;
  orderId: string;
  nextState: OrderState;
}

export type UpdateOrderStateResult =
  | {
      success: true;
      state: OrderState;
    }
  | {
      success: false;
      message: string;
    };

export function isOrderState(value: unknown): value is OrderState {
  return (
    value === "pendiente" ||
    value === "preparando" ||
    value === "listo" ||
    value === "entregado" ||
    value === "cancelado"
  );
}

export function getOrderStateLabel(state: OrderState): string {
  return ORDER_STATE_LABELS[state];
}

export function getAvailableOrderStateTransitions(
  state: OrderState
): OrderState[] {
  return ORDER_STATE_TRANSITIONS[state];
}

export function canTransitionOrderState(
  currentState: OrderState,
  nextState: OrderState
): boolean {
  return ORDER_STATE_TRANSITIONS[currentState].includes(nextState);
}

export async function updateOrderStateAgent({
  tenantId,
  orderId,
  nextState,
}: UpdateOrderStateInput): Promise<UpdateOrderStateResult> {
  const orderRef = doc(db, "tenants", tenantId, "orders", orderId);

  try {
    await runTransaction(db, async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists()) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const orderData = (orderSnapshot.data() ?? {}) as OrderStateRecord;

      if (!isOrderState(orderData.estado)) {
        throw new Error("INVALID_CURRENT_STATE");
      }

      if (!canTransitionOrderState(orderData.estado, nextState)) {
        throw new Error("INVALID_TRANSITION");
      }

      transaction.update(orderRef, {
        estado: nextState,
        updatedAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp(),
      });
    });

    return {
      success: true,
      state: nextState,
    };
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "ORDER_NOT_FOUND":
          return {
            success: false,
            message: "El pedido ya no existe en Firestore.",
          };
        case "INVALID_CURRENT_STATE":
          return {
            success: false,
            message: "El pedido tiene un estado inválido y no se puede actualizar.",
          };
        case "INVALID_TRANSITION":
          return {
            success: false,
            message: "La transición solicitada no es válida para el estado actual.",
          };
        default:
          return {
            success: false,
            message: error.message,
          };
      }
    }

    return {
      success: false,
      message: "No se pudo actualizar el estado del pedido.",
    };
  }
}
