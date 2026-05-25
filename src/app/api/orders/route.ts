import { NextResponse } from "next/server";

import { firestoreWriterAgent } from "@/modules/orders/agents/firestoreWriterAgent";
import { orderValidatorAgent } from "@/modules/orders/agents/orderValidatorAgent";
import { whatsappComandaAgent } from "@/modules/orders/agents/whatsappComandaAgent";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";

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

    const persistedOrder = await firestoreWriterAgent(validation.data);

    if (!persistedOrder.success) {
      return NextResponse.json(
        {
          success: false,
          message: persistedOrder.message,
        },
        { status: 500 }
      );
    }

    const whatsappMessage = whatsappComandaAgent(validation.data);
    const whatsappDelivery = await whatsappSenderAgent({
      tenantId: validation.data.tenantId,
      whatsappMessage,
    });

    return NextResponse.json(
      {
        success: true,
        message: whatsappDelivery.success
          ? "Pedido guardado y enviado por WhatsApp correctamente."
          : "Pedido guardado correctamente, pero falló el envío por WhatsApp.",
        orderId: persistedOrder.orderId,
        order: validation.data,
        whatsappMessage,
        whatsappDelivery,
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
