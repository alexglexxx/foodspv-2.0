import type {
  MetaWebhookPayload,
  WebhookEventSummary,
} from "../types/metaWebhook";

interface PhoneNumberRouteResult {
  handled: boolean;
  phoneNumberId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseMetaWebhookPayload(
  payload: unknown
): MetaWebhookPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const entry = Array.isArray(payload.entry) ? payload.entry : undefined;

  return {
    object: typeof payload.object === "string" ? payload.object : undefined,
    entry: entry as MetaWebhookPayload["entry"],
  };
}

export function extractPhoneNumberId(
  payload: MetaWebhookPayload | null
): string | null {
  if (!payload?.entry) {
    return null;
  }

  for (const entry of payload.entry) {
    if (!Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;

      if (typeof phoneNumberId === "string" && phoneNumberId.trim().length > 0) {
        return phoneNumberId.trim();
      }
    }
  }

  return null;
}

export function summarizeMetaWebhookEvent(
  payload: MetaWebhookPayload | null
): WebhookEventSummary {
  const entryList = payload?.entry ?? [];
  const changeList = entryList.flatMap((entry) =>
    Array.isArray(entry.changes) ? entry.changes : []
  );

  return {
    object: payload?.object ?? null,
    entryCount: entryList.length,
    changeCount: changeList.length,
    phoneNumberId: extractPhoneNumberId(payload),
    fields: changeList
      .map((change) => change.field)
      .filter((field): field is string => typeof field === "string"),
    hasMessages: changeList.some((change) =>
      Array.isArray(change.value?.messages)
    ),
    hasStatuses: changeList.some((change) =>
      Array.isArray(change.value?.statuses)
    ),
  };
}

export function routeWebhookByPhoneNumberId(
  phoneNumberId: string | null,
  payload: MetaWebhookPayload | null
): PhoneNumberRouteResult {
  if (!phoneNumberId) {
    return {
      handled: false,
      phoneNumberId: null,
    };
  }

  switch (phoneNumberId) {
    default:
      // Placeholder for tenant-specific routing by Meta phone_number_id.
      void payload;
      return {
        handled: false,
        phoneNumberId,
      };
  }
}

export function logWebhookEvent(summary: WebhookEventSummary): void {
  console.info("Meta webhook event received", summary);
}
