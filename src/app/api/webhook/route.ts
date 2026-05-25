import { NextResponse, type NextRequest } from "next/server";

import {
  extractPhoneNumberId,
  logWebhookEvent,
  parseMetaWebhookPayload,
  routeWebhookByPhoneNumberId,
  summarizeMetaWebhookEvent,
} from "@/modules/webhook/services/metaWebhookService";

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
  try {
    const rawPayload = (await request.json()) as unknown;
    const payload = parseMetaWebhookPayload(rawPayload);
    const phoneNumberId = extractPhoneNumberId(payload);
    const tenantRoute = await routeWebhookByPhoneNumberId(phoneNumberId, payload);
    const summary = summarizeMetaWebhookEvent(payload, tenantRoute);

    logWebhookEvent(summary);
  } catch (error) {
    console.error("Meta webhook payload could not be processed safely.", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
