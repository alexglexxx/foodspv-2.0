import type {
  ProductPricingMode,
  SelectedProductOption,
} from "./product.types";

export interface CartItem {
  cartItemId:string;

  productId:string;

  productName:string;

  quantity:number;

  pricingMode?:ProductPricingMode;

  unitPrice?:number | null;

  quoteRequired?:boolean;

  notes?:string;

  selectedOptions?:SelectedProductOption[];

}
