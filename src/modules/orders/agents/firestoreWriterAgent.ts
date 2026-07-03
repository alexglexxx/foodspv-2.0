import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

import { Order } from "../types/order";

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
      createdAt: FieldValue.serverTimestamp()
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
