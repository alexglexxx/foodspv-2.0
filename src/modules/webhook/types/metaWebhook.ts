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
  fields: string[];
  hasMessages: boolean;
  hasStatuses: boolean;
}
