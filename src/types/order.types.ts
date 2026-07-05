import { CartItem } from "./cart.types";
import type {
  ProductPricingMode,
  SelectedProductOption,
} from "./product.types";

export type OrderTotalMode = "fixed" | "partial_quote" | "quote_only";

export interface OrderItem {
productId:string;

name:string;

quantity:number;

pricingMode?:ProductPricingMode;

unitPrice?:number | null;

quoteRequired?:boolean;

selectedOptions?:SelectedProductOption[];

notes?:string;
}

export interface OrderCustomer {
customerId:string;

customerCode:string;

nombre:string;

telefono:string;
}

export interface DeliveryAddressDetails {
street:string;

number:string;

neighborhood:string;

reference:string;
}

export interface Order {

id:string;

tenantId:string;

customerName:string;

customerPhone:string;

customer?:OrderCustomer;

items:CartItem[];

total:number;

hasQuoteItems?:boolean;

totalMode?:OrderTotalMode;

deliveryType?:"pickup" | "delivery";

deliveryAddress?:string;

deliveryAddressDetails?:DeliveryAddressDetails;

deliveryFee?:number;

status:
| "pending"
| "preparing"
| "ready"
| "delivered";

createdAt:Date;

}
