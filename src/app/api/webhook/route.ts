import { NextResponse, type NextRequest } from "next/server";

import {
  decideTenantWebhookAction,
  extractPhoneNumberId,
  logWebhookEvent,
  parseMetaWebhookPayload,
  routeWebhookByPhoneNumberId,
  summarizeMetaWebhookEvent,
} from "@/modules/webhook/services/metaWebhookService";
import {
  getMetaWebhookSignatureHeader,
  verifyMetaWebhookSignature,
} from "@/modules/webhook/services/metaWebhookSecurity";
import { whatsappWorkerAgent } from "@/modules/whatsapp/agents/whatsappWorkerAgent";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    typeof expectedToken === "string" &&
    expectedToken.length > 0 &&
    verifyToken === expectedToken &&
    typeof challenge === "string"
  ) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    {
      success: false,
      message: "Forbidden",
    },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;

  if (typeof appSecret !== "string" || appSecret.trim().length === 0) {
    console.error("META_APP_SECRET no configurado para validar webhook.");

    return NextResponse.json(
      {
        success: false,
        message: "Webhook signature validation is not configured.",
      },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader = getMetaWebhookSignatureHeader(request);
  const signatureIsValid = verifyMetaWebhookSignature({
    rawBody,
    signatureHeader,
    appSecret,
  });

  if (!signatureIsValid) {
    console.warn("Webhook Meta rechazado por firma inválida.");

    return NextResponse.json(
      {
        success: false,
        message: "Invalid webhook signature.",
      },
      { status: 401 }
    );
  }

  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(rawBody) as unknown;
  } catch (error) {
    console.error("Meta webhook payload is not valid JSON.", {
      error: error instanceof Error ? error.message : "invalid_json",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Invalid webhook payload.",
      },
      { status: 400 }
    );
  }

  const payload = parseMetaWebhookPayload(rawPayload);

  if (payload === null) {
    return NextResponse.json(
      {
        success: false,
        message: "Unsupported webhook payload.",
      },
      { status: 400 }
    );
  }

  try {
    const phoneNumberId = extractPhoneNumberId(payload);
    const tenantRoute = await routeWebhookByPhoneNumberId(phoneNumberId, payload);
    const tenantAction = await decideTenantWebhookAction(tenantRoute, payload);
    const workerResult = await whatsappWorkerAgent({
      tenantAction,
      payload,
      tenantRoute,
    });
    const summary = summarizeMetaWebhookEvent(payload, tenantRoute);

    logWebhookEvent(summary);
    console.info("Meta tenant action resolved", tenantAction);
    console.info("WhatsApp worker result", workerResult);

    if (!workerResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: workerResult.error ?? "Webhook processing failed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Meta webhook payload could not be processed safely.", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
