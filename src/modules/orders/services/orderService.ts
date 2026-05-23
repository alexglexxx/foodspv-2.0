import { firestoreWriterAgent } from "@/modules/orders/agents/firestoreWriterAgent";

import { Order } from "../types/order";

export async function createOrder(order: Order) {
  const result = await firestoreWriterAgent(order);

  if (!result.success) {
    return {
      success: false,
      id: null,
    };
  }

  return {
    success: true,
    id: result.orderId,
  };
}
