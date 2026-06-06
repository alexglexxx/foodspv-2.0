import type { SelectedProductOption } from "./product.types";

export interface CartItem {
  cartItemId:string;

  productId:string;

  productName:string;

  quantity:number;

  unitPrice:number;

  notes?:string;

  selectedOptions?:SelectedProductOption[];

}
