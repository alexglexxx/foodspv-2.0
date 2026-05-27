import type { TenantTheme } from "@/modules/theme/types/theme";

export type SuperAdminTenantStatus = "active" | "inactive";

export type SuperAdminOrderFlowMode = "simple_whatsapp" | "dashboard_managed";

export type SuperAdminOrderConfirmationAction =
  | "allow"
  | "require_manual_confirmation";

export interface SuperAdminOrderConfirmationPolicy {
  enabled: boolean;
  amountThreshold: number;
  action: SuperAdminOrderConfirmationAction;
}

export interface SuperAdminTenantStats {
  productsCount: number;
  activeProductsCount: number;
  ordersCount: number;
  pendingOrdersCount: number;
  totalSales: number;
}

export interface SuperAdminTenantSummary {
  tenantId: string;
  name: string;
  category: string;
  featuredCategory: string;
  description: string;
  greeting: string;
  estimatedTime: string;
  location: string;
  heroImageUrl: string;
  whatsappPhone: string;
  metaPhoneNumberId: string;
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
  orderConfirmationPolicy: SuperAdminOrderConfirmationPolicy;
  tenantTheme: TenantTheme;
  publicUrl: string;
  qrCode: string;
  stats: SuperAdminTenantStats;
}

export interface SuperAdminTenantInput {
  tenantId: string;
  name: string;
  category: string;
  featuredCategory: string;
  description: string;
  greeting: string;
  estimatedTime: string;
  location: string;
  heroImageUrl: string;
  whatsappPhone: string;
  metaPhoneNumberId: string;
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
  orderConfirmationPolicy: SuperAdminOrderConfirmationPolicy;
  tenantTheme: TenantTheme;
}

export type SuperAdminTenantsResponse =
  | {
      success: true;
      tenants: SuperAdminTenantSummary[];
    }
  | {
      success: false;
      message: string;
    };

export type SuperAdminTenantMutationResponse =
  | {
      success: true;
      tenant: SuperAdminTenantSummary | null;
    }
  | {
      success: false;
      message: string;
    };
