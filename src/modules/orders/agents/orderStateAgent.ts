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
