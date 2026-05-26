export interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id?: string;
  changes?: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field?: string;
  value?: MetaWebhookValue;
}

export interface MetaWebhookValue {
  metadata?: {
    phone_number_id?: string;
    display_phone_number?: string;
  };
  messages?: unknown[];
  statuses?: unknown[];
}

export interface WebhookEventSummary {
  object: string | null;
  entryCount: number;
  changeCount: number;
  phoneNumberId: string | null;
  tenantId: string | null;
  tenantFound: boolean;
  fields: string[];
  hasMessages: boolean;
  hasStatuses: boolean;
}

export type TenantActionEventType =
  | "message_received"
  | "message_status"
  | "unknown_event";

export type TenantActionName =
  | "process_customer_message"
  | "update_message_status"
  | "ignore_event";

export interface TenantActionEngineResult {
  eventType: TenantActionEventType;
  action: TenantActionName;
  shouldProcess: boolean;
}
