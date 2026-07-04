import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

import type { Order, OrderWhatsAppState } from "../types/order";

export type FirestoreWriterResult =
  | {
      success: true;
      orderId: string;
    }
  | {
      success: false;
      orderId: null;
      message: string;
    };

export async function firestoreWriterAgent(
  order: Order
): Promise<FirestoreWriterResult> {

  try {
    const orderRef = adminDb
      .collection("tenants")
      .doc(order.tenantId)
      .collection("orders")
      .doc();

    await orderRef.set({
      orderId: orderRef.id,
      ...order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      orderId: orderRef.id
    };

  } catch (error) {

    console.error(
      "Error guardando orden:",
      error
    );

    return {
      success: false,
      orderId: null,
      message: "No se pudo guardar la orden en Firestore."
    };

  }

}

interface UpdateFirestoreOrderWhatsAppInput {
  tenantId: string;
  orderId: string;
  whatsapp: OrderWhatsAppState;
}

export async function updateFirestoreOrderWhatsAppAgent(
  input: UpdateFirestoreOrderWhatsAppInput
): Promise<void> {
  await adminDb
    .collection("tenants")
    .doc(input.tenantId)
    .collection("orders")
    .doc(input.orderId)
    .set(
      {
        whatsapp: {
          attempted: input.whatsapp.attempted,
          sent: input.whatsapp.sent,
          status: input.whatsapp.status ?? null,
          messageId: input.whatsapp.messageId,
          error: input.whatsapp.error,
          sentAt: input.whatsapp.sent
            ? FieldValue.serverTimestamp()
            : null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
