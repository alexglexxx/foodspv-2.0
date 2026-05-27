export type OrderFlowMode = "simple_whatsapp" | "dashboard_managed";

export interface TenantOrderFlowConfig {
  orderFlowMode: OrderFlowMode;
  estimatedPreparationMinutes: number;
}

export interface Tenant {
  id: string;
  tenantId?: string;

  name: string;
  slug?: string;
  category?: string;
  featuredCategory?: string;

  description?: string;
  greeting?: string;
  rating?: string;
  reviews?: string;
  estimatedTime?: string;
  location?: string;

  phone?: string;
  whatsappPhone?: string;

  logoUrl?: string;
  heroImageUrl?: string;

  active?: boolean;
  status?: "active" | "inactive";

  orderFlowMode?: OrderFlowMode;
  estimatedPreparationMinutes?: number;

  createdAt?: Date;
  updatedAt?: Date;
}
