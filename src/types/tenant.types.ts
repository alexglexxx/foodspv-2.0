export type OrderFlowMode =
  | "simple_whatsapp"
  | "dashboard_managed";

export interface TenantOrderFlowConfig {
  orderFlowMode: OrderFlowMode;
  estimatedPreparationMinutes: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;

  phone: string;
  whatsappPhone?: string;

  logoUrl?: string;

  active: boolean;
  orderFlowMode: OrderFlowMode;
  estimatedPreparationMinutes: number;

  createdAt: Date;
  updatedAt: Date;
}
