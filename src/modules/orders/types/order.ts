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

  estado:
  | "pendiente"
  | "preparando"
  | "listo"
  | "entregado";

  createdAt:number;

}
