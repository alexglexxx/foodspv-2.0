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

export interface Product {
  id: string;

  tenantId: string;

  name: string;

  description?: string;

  price: number;

  imageUrl?: string;

  available: boolean;

  category?: string;

  options?: ProductOption[];
}
