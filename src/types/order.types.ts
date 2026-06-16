import { CartItem } from "./cart.types";
import type { SelectedProductOption } from "./product.types";

export interface OrderItem {
productId:string;

name:string;

quantity:number;

unitPrice:number;

selectedOptions?:SelectedProductOption[];
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
