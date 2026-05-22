import { CartItem } from "./cart.types";

export interface Order {

id:string;

tenantId:string;

customerName:string;

customerPhone:string;

items:CartItem[];

total:number;

status:
| "pending"
| "preparing"
| "ready"
| "delivered";

createdAt:Date;

}
