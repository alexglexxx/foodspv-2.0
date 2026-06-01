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

export interface Order {

  tenantId:string;

  tenantSlug?:string;

  cliente:CustomerInfo;

  customer?:OrderCustomer;

  productos:OrderItem[];

  total:number;

  deliveryType?:"pickup" | "delivery";

  deliveryAddress?:string;

  deliveryFee?:number;

  estado:OrderState;

  createdAt:number;

}
