export interface ProductOptionValue {
  id: string;
  label: string;
  priceDelta?: number;
  active: boolean;
}

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

  price: number;

  imageUrl?: string;

  images?: ProductImage[];

  available: boolean;

  active?: boolean;

  deletedAt?: unknown;

  category?: string;

  options?: ProductOption[];
}
