export type SuperAdminTenantStatus = "active" | "inactive";

export type SuperAdminOrderFlowMode = "simple_whatsapp" | "dashboard_managed";

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
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
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
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
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
