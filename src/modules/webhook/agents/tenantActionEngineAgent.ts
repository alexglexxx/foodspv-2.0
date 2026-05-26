import type {
  MetaWebhookPayload,
  TenantActionEngineResult,
} from "../types/metaWebhook";

interface TenantActionEngineTenant {
  [key: string]: unknown;
}

function hasMessages(payload: MetaWebhookPayload | null): boolean {
  if (!payload?.entry) {
    return false;
  }

  return payload.entry.some((entry) =>
    Array.isArray(entry.changes) &&
    entry.changes.some((change) => Array.isArray(change.value?.messages))
  );
}

function hasStatuses(payload: MetaWebhookPayload | null): boolean {
  if (!payload?.entry) {
    return false;
  }

  return payload.entry.some((entry) =>
    Array.isArray(entry.changes) &&
    entry.changes.some((change) => Array.isArray(change.value?.statuses))
  );
}

export async function tenantActionEngineAgent(input: {
  tenantId: string;
  payload: MetaWebhookPayload | null;
  tenant: TenantActionEngineTenant;
}): Promise<TenantActionEngineResult> {
  void input.tenantId;
  void input.tenant;

  if (hasMessages(input.payload)) {
    return {
      eventType: "message_received",
      action: "process_customer_message",
      shouldProcess: true,
    };
  }

  if (hasStatuses(input.payload)) {
    return {
      eventType: "message_status",
      action: "update_message_status",
      shouldProcess: false,
    };
  }

  return {
    eventType: "unknown_event",
    action: "ignore_event",
    shouldProcess: false,
  };
}
