import "server-only";

const META_GRAPH_API_BASE_URL = "https://graph.facebook.com";
const META_GRAPH_API_VERSION = "v22.0";
const META_MESSAGES_ENDPOINT = `${META_GRAPH_API_BASE_URL}/${META_GRAPH_API_VERSION}`;

export type WhatsAppCloudSendStatus = "sent" | "config_error" | "api_error";

export interface WhatsAppCloudTextMessageInput {
  to: string;
  body: string;
  phoneNumberId: string;
  accessToken: string;
}

export interface WhatsAppCloudSendResult {
  success: boolean;
  status: WhatsAppCloudSendStatus;
  messageId: string | null;
  error: string | null;
}

interface MetaMessagesResponse {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createResult(
  status: WhatsAppCloudSendStatus,
  error: string | null,
  messageId: string | null = null
): WhatsAppCloudSendResult {
  return {
    success: status === "sent",
    status,
    messageId,
    error,
  };
}

function normalizeMetaMessagesResponse(value: unknown): MetaMessagesResponse {
  if (!isRecord(value)) {
    return {};
  }

  const firstMessage = Array.isArray(value.messages)
    ? value.messages.find(isRecord)
    : undefined;
  const error = isRecord(value.error) ? value.error : undefined;

  return {
    messages: firstMessage
      ? [
          {
            id: isNonEmptyString(firstMessage.id)
              ? firstMessage.id.trim()
              : undefined,
          },
        ]
      : undefined,
    error: error
      ? {
          message: isNonEmptyString(error.message)
            ? error.message.trim()
            : undefined,
        }
      : undefined,
  };
}

async function parseMetaError(response: Response): Promise<string> {
  try {
    const data = normalizeMetaMessagesResponse(await response.json());
    const apiMessage = data.error?.message;

    if (isNonEmptyString(apiMessage)) {
      return `Meta API error (${response.status}): ${apiMessage}`;
    }
  } catch {
    // Ignore invalid JSON and fall back to the generic HTTP error.
  }

  return `Meta API error (${response.status} ${response.statusText}).`;
}

export async function sendWhatsAppTextMessage(
  input: WhatsAppCloudTextMessageInput
): Promise<WhatsAppCloudSendResult> {
  const accessToken = isNonEmptyString(input.accessToken)
    ? input.accessToken.trim()
    : "";
  const phoneNumberId = isNonEmptyString(input.phoneNumberId)
    ? input.phoneNumberId.trim()
    : "";
  const to = isNonEmptyString(input.to) ? input.to.trim() : "";
  const body = isNonEmptyString(input.body) ? input.body.trim() : "";

  if (!accessToken) {
    return createResult("config_error", "Meta access token requerido.");
  }

  if (!phoneNumberId) {
    return createResult("config_error", "Meta phone number ID requerido.");
  }

  if (!to) {
    return createResult("config_error", "Destinatario WhatsApp requerido.");
  }

  if (!body) {
    return createResult("config_error", "Texto WhatsApp requerido.");
  }

  try {
    const response = await fetch(
      `${META_MESSAGES_ENDPOINT}/${phoneNumberId.trim()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: false,
            body,
          },
        }),
      }
    );

    if (!response.ok) {
      return createResult("api_error", await parseMetaError(response));
    }

    const data = normalizeMetaMessagesResponse(await response.json());
    const messageId = data.messages?.[0]?.id;

    if (!isNonEmptyString(messageId)) {
      return createResult("api_error", "Meta respondió sin messages[0].id.");
    }

    return createResult("sent", null, messageId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado enviando mensaje por WhatsApp.";

    return createResult("api_error", message);
  }
}
