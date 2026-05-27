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
}

export interface Order {

  tenantId:string;

  cliente:CustomerInfo;

  productos:OrderItem[];

  total:number;

  estado:OrderState;

  createdAt:number;

}
