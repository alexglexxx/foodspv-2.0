import type { OrderFlowMode } from "@/types/tenant.types";
import type { WhatsAppSendStatus } from "./whatsapp";
import type { SelectedProductOption } from "@/types/product.types";

export const ORDER_STATES = [
  "requires_confirmation",
  "pendiente",
  "preparando",
  "listo",
  "entregado",
  "cancelado",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export interface OrderItem {
  id:string;
  nombre:string;
  precio:number;
  cantidad:number;
  selectedOptions?:SelectedProductOption[];
}

export interface DeliveryAddressDetails {
  street:string;
  number:string;
  neighborhood:string;
  reference:string;
}

export interface CustomerInfo {
  nombre:string;
  telefono:string;
  address?:string;
  customerCode?:string;
}

export interface OrderCustomer {
  customerId:string;
  customerCode:string;
  nombre:string;
  telefono:string;
}

export interface OrderWhatsAppState {
  attempted:boolean;
  sent:boolean;
  status?:WhatsAppSendStatus;
  messageId:string | null;
  error:string | null;
  sentAt?:number | null;
}

export interface Order {

  orderId?:string;

  tenantId:string;

  tenantSlug?:string;

  cliente:CustomerInfo;

  customer?:OrderCustomer;

  customerId?:string;

  customerCode?:string;

  productos:OrderItem[];

  total:number;

  deliveryType?:"pickup" | "delivery";

  deliveryAddress?:string;

  deliveryAddressDetails?:DeliveryAddressDetails;

  deliveryFee?:number;

  orderFlowMode?:OrderFlowMode;

  estado:OrderState;

  orderState?:OrderState;

  whatsapp?:OrderWhatsAppState;

  createdAt:number;

  updatedAt?:number;

}
