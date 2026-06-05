import type { TenantCategory } from "@/modules/design/tenantDesignPresets";

export type {
  TenantTheme,
  TenantThemeTypography,
  TenantThemeVisualStyle,
} from "@/modules/theme/types/theme";
export type { TenantCategory } from "@/modules/design/tenantDesignPresets";

export type OrderFlowMode = "simple_whatsapp" | "dashboard_managed";
export type OrderConfirmationAction =
  | "allow"
  | "require_manual_confirmation";

export interface TenantOrderFlowConfig {
  orderFlowMode: OrderFlowMode;
  estimatedPreparationMinutes: number;
}

export interface TenantOrderConfirmationPolicy {
  enabled: boolean;
  amountThreshold: number;
  action: OrderConfirmationAction;
}

export interface TenantDeliveryConfig {
  enabled: boolean;
  fee?: number;
  minimumOrder?: number;
  notes?: string;
}

export interface Tenant {
  id: string;
  tenantId?: string;

  name: string;
  slug?: string;
  category?: TenantCategory;
  featuredCategory?: string;
  designPresetId?: string;

  description?: string;
  greeting?: string;
  rating?: string;
  reviews?: string;
  estimatedTime?: string;
  location?: string;

  phone?: string;
  whatsappPhone?: string;
  metaPhoneNumberId?: string;

  logoUrl?: string;
  heroImageUrl?: string;

  active?: boolean;
  status?: "active" | "inactive";

  orderFlowMode?: OrderFlowMode;
  estimatedPreparationMinutes?: number;
  orderConfirmationPolicy?: TenantOrderConfirmationPolicy;
  deliveryConfig?: TenantDeliveryConfig;
  deliveryEnabled?: boolean;
  deliveryFee?: number;

  createdAt?: Date;
  updatedAt?: Date;
}
