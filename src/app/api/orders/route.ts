import { NextResponse } from "next/server";

import { customerConfirmationAgent } from "@/modules/orders/agents/customerConfirmationAgent";
import { firestoreWriterAgent } from "@/modules/orders/agents/firestoreWriterAgent";
import { orderValidatorAgent } from "@/modules/orders/agents/orderValidatorAgent";
import { tenantOrderFlowConfigAgent } from "@/modules/orders/agents/tenantOrderFlowConfigAgent";
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

    const tenantOrderFlow = await tenantOrderFlowConfigAgent(
      validation.data.tenantId
    );
    const whatsappMessage = whatsappComandaAgent(validation.data);
    const whatsappDelivery = await whatsappSenderAgent({
      tenantId: validation.data.tenantId,
      whatsappMessage,
    });
    const shouldSendCustomerConfirmation =
      tenantOrderFlow.config.orderFlowMode === "simple_whatsapp" &&
      whatsappDelivery.success;
    const customerConfirmationMessage = shouldSendCustomerConfirmation
      ? customerConfirmationAgent({
          order: validation.data,
          tenantName: tenantOrderFlow.tenantName,
          estimatedPreparationMinutes:
            tenantOrderFlow.config.estimatedPreparationMinutes,
        })
      : null;
    const customerConfirmationDelivery = customerConfirmationMessage
      ? await whatsappSenderAgent({
          tenantId: validation.data.tenantId,
          whatsappMessage: customerConfirmationMessage,
          recipientPhone: validation.data.cliente.telefono,
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
        order: validation.data,
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
