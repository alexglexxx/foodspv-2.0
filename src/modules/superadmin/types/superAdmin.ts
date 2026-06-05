import type { TenantCategory } from "@/modules/design/tenantDesignPresets";

export type SuperAdminTenantStatus = "active" | "inactive";

export type SuperAdminOrderFlowMode = "simple_whatsapp" | "dashboard_managed";

export type SuperAdminProductPricingMode =
  | "included"
  | "additive"
  | "tier_upgrade";

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
  category: TenantCategory;
  featuredCategory: string;
  designPresetId: string;
  description: string;
  greeting: string;
  estimatedTime: string;
  location: string;
  heroImageUrl: string;
  active: boolean;
  whatsappPhone: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
  orderConfirmationPolicy: SuperAdminOrderConfirmationPolicy;
  deliveryEnabled: boolean;
  deliveryFee: number;
  publicUrl: string;
  qrCode: string;
  stats: SuperAdminTenantStats;
}

export interface SuperAdminTenantInput {
  tenantId: string;
  name: string;
  category: TenantCategory;
  featuredCategory: string;
  designPresetId: string;
  description: string;
  greeting: string;
  estimatedTime: string;
  location: string;
  heroImageUrl: string;
  active: boolean;
  whatsappPhone: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  rating: string;
  reviews: string;
  status: SuperAdminTenantStatus;
  orderFlowMode: SuperAdminOrderFlowMode;
  estimatedPreparationMinutes: number;
  orderConfirmationPolicy: SuperAdminOrderConfirmationPolicy;
  deliveryEnabled: boolean;
  deliveryFee: number;
}

export interface SuperAdminProductModifier {
  id: string;
  name: string;
  pricingMode: SuperAdminProductPricingMode;
  priceDelta: number;
  active: boolean;
}

export interface SuperAdminProductSummary {
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  active: boolean;
  available: boolean;
  modifiers: SuperAdminProductModifier[];
  createdAt: number | null;
  updatedAt: number | null;
}

export interface SuperAdminProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  active: boolean;
  available: boolean;
  modifiers?: SuperAdminProductModifier[];
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

export type SuperAdminProductsResponse =
  | {
      success: true;
      products: SuperAdminProductSummary[];
    }
  | {
      success: false;
      message: string;
    };

export type SuperAdminProductMutationResponse =
  | {
      success: true;
      product: SuperAdminProductSummary | null;
    }
  | {
      success: false;
      message: string;
    };
