import { db } from "@/lib/firebase";

import {
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

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
    const orderRef = doc(
      collection(
        db,
        "tenants",
        order.tenantId,
        "orders"
      )
    );

    await setDoc(
      orderRef,
      {
        orderId: orderRef.id,
        ...order,
        createdAt: serverTimestamp()
      }
    );

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
