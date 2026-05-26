import type { DocumentData } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

import type {
  TenantWhatsAppConfig,
  WhatsAppSendResult,
  WhatsAppSendStatus,
} from "../types/whatsapp";

const META_GRAPH_API_BASE_URL = "https://graph.facebook.com";
const META_GRAPH_API_VERSION = "v22.0";
const META_MESSAGES_ENDPOINT = `${META_GRAPH_API_BASE_URL}/${META_GRAPH_API_VERSION}`;

interface WhatsAppSenderInput {
  tenantId: string;
  whatsappMessage: string;
  recipientPhone?: string;
}

interface MetaMessagesResponse {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
  };
}

function createResult(
  status: WhatsAppSendStatus,
  error: string | null,
  messageId: string | null = null
): WhatsAppSendResult {
  return {
    success: status === "sent",
    status,
    messageId,
    error,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getMissingTenantFields(
  data: DocumentData,
  requiresDefaultRecipient: boolean
): string[] {
  const missingFields: string[] = [];

  if (typeof data.active !== "boolean") {
    missingFields.push("active");
  }

  if (requiresDefaultRecipient && !isNonEmptyString(data.whatsappPhone)) {
    missingFields.push("whatsappPhone");
  }

  if (!isNonEmptyString(data.metaPhoneNumberId)) {
    missingFields.push("metaPhoneNumberId");
  }

  if (!isNonEmptyString(data.metaAccessToken)) {
    missingFields.push("metaAccessToken");
  }

  return missingFields;
}

function mapTenantConfig(data: DocumentData): TenantWhatsAppConfig {
  return {
    active: data.active,
    whatsappPhone: data.whatsappPhone.trim(),
    metaPhoneNumberId: data.metaPhoneNumberId.trim(),
    metaAccessToken: data.metaAccessToken.trim(),
  };
}

async function parseMetaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as MetaMessagesResponse;
    const apiMessage = data.error?.message;

    if (isNonEmptyString(apiMessage)) {
      return `Meta API error (${response.status}): ${apiMessage}`;
    }
  } catch {
    // Ignore invalid JSON and fall back to the generic HTTP error.
  }

  return `Meta API error (${response.status} ${response.statusText}).`;
}

export async function whatsappSenderAgent(
  input: WhatsAppSenderInput
): Promise<WhatsAppSendResult> {
  const tenantId = isNonEmptyString(input.tenantId) ? input.tenantId.trim() : "";
  const whatsappMessage = isNonEmptyString(input.whatsappMessage)
    ? input.whatsappMessage.trim()
    : "";
  const recipientPhone = isNonEmptyString(input.recipientPhone)
    ? input.recipientPhone.trim()
    : null;

  if (!tenantId) {
    return createResult("config_error", "tenantId es obligatorio.");
  }

  if (!whatsappMessage) {
    return createResult(
      "config_error",
      "whatsappMessage es obligatorio y no puede estar vacío."
    );
  }

  try {
    const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

    if (!tenantSnapshot.exists) {
      return createResult(
        "tenant_not_found",
        `No existe configuración para tenants/${tenantId}.`
      );
    }

    const tenantData = tenantSnapshot.data() ?? {};
    const missingFields = getMissingTenantFields(
      tenantData,
      recipientPhone === null
    );

    if (missingFields.length > 0) {
      return createResult(
        "config_error",
        `Configuración WhatsApp incompleta para el tenant: ${missingFields.join(
          ", "
        )}.`
      );
    }

    const tenantConfig = mapTenantConfig(tenantData);

    if (!tenantConfig.active) {
      return createResult(
        "tenant_inactive",
        `El tenant ${tenantId} está inactivo.`
      );
    }

    const response = await fetch(
      `${META_MESSAGES_ENDPOINT}/${tenantConfig.metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantConfig.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone ?? tenantConfig.whatsappPhone,
          type: "text",
          text: {
            preview_url: false,
            body: whatsappMessage,
          },
        }),
      }
    );

    if (!response.ok) {
      return createResult("api_error", await parseMetaError(response));
    }

    const data = (await response.json()) as MetaMessagesResponse;
    const messageId = data.messages?.[0]?.id;

    if (!isNonEmptyString(messageId)) {
      return createResult(
        "api_error",
        "Meta respondió sin messages[0].id."
      );
    }

    return createResult("sent", null, messageId);
  } catch (error) {
    console.error("Error enviando mensaje por WhatsApp:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado enviando mensaje por WhatsApp.";

    return createResult("api_error", message);
  }
}
