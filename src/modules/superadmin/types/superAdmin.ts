import type { TenantCategory } from "@/modules/design/tenantDesignPresets";
import type {
  TenantVisualPreset,
  TenantVisualPresetId,
} from "@/modules/design/tenantVisualPresets";
import type { UserRole } from "@/modules/auth/types/userRole";
import type { ProductOption, ProductImage } from "@/types/product.types";

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

export interface SuperAdminDeliveryConfig {
  enabled: boolean;
  fee?: number;
  minimumOrder?: number;
  notes?: string;
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
  visualPresetId: TenantVisualPresetId;
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
  deliveryConfig: SuperAdminDeliveryConfig;
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
  visualPresetId: TenantVisualPresetId;
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
  deliveryConfig: SuperAdminDeliveryConfig;
  deliveryEnabled: boolean;
  deliveryFee: number;
}

export type SuperAdminProductOption = ProductOption;

export interface SuperAdminProductSummary {
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  images?: ProductImage[];
  active: boolean;
  available: boolean;
  options: SuperAdminProductOption[];
  createdAt: number | null;
  updatedAt: number | null;
}

export interface SuperAdminProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  images?: ProductImage[];
  active: boolean;
  available: boolean;
  options?: SuperAdminProductOption[];
}

export interface SuperAdminUserSummary {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string | null;
  active: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface SuperAdminUserInput {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
  tenantId: string | null;
  active: boolean;
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
      availableVisualPresets?: TenantVisualPreset[];
    }
  | {
      success: false;
      message: string;
    };

export type SuperAdminTenantResponse =
  | {
      success: true;
      tenant: SuperAdminTenantSummary;
      availableVisualPresets: TenantVisualPreset[];
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

export type SuperAdminUsersResponse =
  | {
      success: true;
      users: SuperAdminUserSummary[];
    }
  | {
      success: false;
      message: string;
    };

export type SuperAdminUserMutationResponse =
  | {
      success: true;
      user: SuperAdminUserSummary | null;
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
