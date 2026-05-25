export interface TenantWhatsAppConfig {
  active: boolean;
  whatsappPhone: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
}

export type WhatsAppSendStatus =
  | "sent"
  | "config_error"
  | "tenant_not_found"
  | "tenant_inactive"
  | "api_error";

export interface WhatsAppSendResult {
  success: boolean;
  status: WhatsAppSendStatus;
  messageId: string | null;
  error: string | null;
}
