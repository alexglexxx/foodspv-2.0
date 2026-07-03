import type { DocumentData } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { isTenantAvailable } from "@/modules/tenants/tenantAvailability";
import { sendWhatsAppTextMessage } from "@/modules/whatsapp/services/whatsappCloudService";

import type {
  TenantWhatsAppConfig,
  WhatsAppSendResult,
  WhatsAppSendStatus,
} from "../types/whatsapp";

interface WhatsAppSenderInput {
  tenantId: string;
  whatsappMessage: string;
  recipientPhone?: string;
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

    if (!isTenantAvailable(tenantData) || !tenantConfig.active) {
      return createResult(
        "tenant_inactive",
        `El tenant ${tenantId} está inactivo.`
      );
    }

    return sendWhatsAppTextMessage({
      accessToken: tenantConfig.metaAccessToken,
      phoneNumberId: tenantConfig.metaPhoneNumberId,
      to: recipientPhone ?? tenantConfig.whatsappPhone,
      body: whatsappMessage,
    });
  } catch (error) {
    console.error("Error enviando mensaje por WhatsApp:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado enviando mensaje por WhatsApp.";

    return createResult("api_error", message);
  }
}
