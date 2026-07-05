export interface ProductOptionValue {
  id: string;
  label: string;
  priceDelta?: number;
  active: boolean;
}

export type ProductPricingMode = "fixed" | "quote";

export interface ProductOption {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  values: ProductOptionValue[];
}

export interface SelectedProductOption {
  optionId: string;
  optionName: string;
  valueIds: string[];
  valueLabels: string[];
  priceDeltaTotal: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  label?: string;
  sortOrder: number;
  isPrimary?: boolean;
}

export interface Product {
  id: string;

  tenantId: string;

  name: string;

  description?: string;

  pricingMode?: ProductPricingMode;

  price?: number | null;

  imageUrl?: string;

  images?: ProductImage[];

  available: boolean;

  active?: boolean;

  deletedAt?: unknown;

  category?: string;

  options?: ProductOption[];
}

export function normalizeProductPricingMode(input: {
  pricingMode?: unknown;
  price?: unknown;
}): ProductPricingMode {
  if (input.pricingMode === "quote") {
    return "quote";
  }

  if (input.pricingMode === "fixed") {
    return "fixed";
  }

  if (typeof input.price === "number" && Number.isFinite(input.price)) {
    return "fixed";
  }

  return "fixed";
}

export function isQuoteProduct(input: {
  pricingMode?: unknown;
  price?: unknown;
}): boolean {
  return normalizeProductPricingMode(input) === "quote";
}
