import type { OrderState } from "@/modules/orders/types/order";

export type TenantDashboardStatus =
  | "new"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type TenantOrderAction =
  | "mark_preparing"
  | "mark_ready"
  | "mark_delivered"
  | "cancel";

export interface TenantBusinessSummary {
  id: string;
  name: string;
  status: string;
  active: boolean;
}

export interface TenantDashboardProductSummary {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
  options: string[];
}

export interface TenantDashboardOrder {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: TenantDashboardStatus;
  sourceState: OrderState;
  createdAtMs: number;
  createdAtLabel: string;
  products: TenantDashboardProductSummary[];
}

export interface TenantDashboardMetrics {
  ordersToday: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  estimatedSalesToday: number;
}
