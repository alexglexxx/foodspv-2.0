import type { Timestamp } from "firebase/firestore";

import type { OrderState } from "@/modules/orders/types/order";

import type {
  TenantBusinessSummary,
  TenantDashboardMetrics,
  TenantDashboardOrder,
  TenantDashboardProductSummary,
  TenantDashboardStatus,
  TenantOrderAction,
} from "../types";

interface UserRoleRecord {
  role?: unknown;
  tenantId?: unknown;
  active?: unknown;
}

interface TenantRecord {
  name?: unknown;
  businessName?: unknown;
  status?: unknown;
  active?: unknown;
}

interface OrderRecord {
  orderId?: unknown;
  tenantId?: unknown;
  cliente?: {
    nombre?: unknown;
    telefono?: unknown;
  };
  productos?: unknown;
  total?: unknown;
  estado?: unknown;
  createdAt?: Timestamp | { toDate?: () => Date } | number | null;
}

interface OrderProductRecord {
  id?: unknown;
  nombre?: unknown;
  precio?: unknown;
  cantidad?: unknown;
  selectedOptions?: unknown;
}

interface SelectedOptionRecord {
  optionName?: unknown;
  valueLabels?: unknown;
}

export interface TenantAdminProfile {
  role: "superadmin" | "tenant_admin" | "employee";
  tenantId: string | null;
  active: boolean;
}

const STATUS_LABELS: Record<TenantDashboardStatus, string> = {
  new: "new",
  preparing: "preparing",
  ready: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
};

export const ACTION_LABELS: Record<TenantOrderAction, string> = {
  mark_preparing: "Marcar preparando",
  mark_ready: "Marcar listo",
  mark_delivered: "Marcar entregado",
  cancel: "Cancelar",
};

export const ACTION_TARGET_STATE: Record<TenantOrderAction, OrderState> = {
  mark_preparing: "preparando",
  mark_ready: "listo",
  mark_delivered: "entregado",
  cancel: "cancelado",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRole(value: unknown): value is TenantAdminProfile["role"] {
  return value === "superadmin" || value === "tenant_admin" || value === "employee";
}

function isOrderState(value: unknown): value is OrderState {
  return (
    value === "requires_confirmation" ||
    value === "pendiente" ||
    value === "preparando" ||
    value === "listo" ||
    value === "entregado" ||
    value === "cancelado"
  );
}

export function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

export function mapUserProfile(value: unknown): TenantAdminProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as UserRoleRecord;

  if (!isRole(record.role)) {
    return null;
  }

  return {
    role: record.role,
    tenantId: isNonEmptyString(record.tenantId) ? record.tenantId.trim() : null,
    active: record.active !== false,
  };
}

export function mapTenantSummary(
  tenantId: string,
  value: unknown
): TenantBusinessSummary {
  const record = value && typeof value === "object" ? (value as TenantRecord) : {};
  const name = isNonEmptyString(record.name)
    ? record.name.trim()
    : isNonEmptyString(record.businessName)
      ? record.businessName.trim()
      : "Negocio sin nombre";
  const rawStatus = isNonEmptyString(record.status)
    ? record.status.trim()
    : record.active === false
      ? "inactive"
      : "active";

  return {
    id: tenantId,
    name,
    status: rawStatus,
    active: record.active !== false && rawStatus !== "inactive",
  };
}

export function mapDashboardStatus(state: OrderState): TenantDashboardStatus {
  switch (state) {
    case "requires_confirmation":
    case "pendiente":
      return "new";
    case "preparando":
      return "preparing";
    case "listo":
      return "ready";
    case "entregado":
      return "delivered";
    case "cancelado":
      return "cancelled";
  }
}

export function getDashboardStatusLabel(status: TenantDashboardStatus): string {
  return STATUS_LABELS[status];
}

export function getAvailableTenantOrderActions(
  status: TenantDashboardStatus
): TenantOrderAction[] {
  switch (status) {
    case "new":
      return ["mark_preparing", "cancel"];
    case "preparing":
      return ["mark_ready", "cancel"];
    case "ready":
      return ["mark_delivered"];
    case "delivered":
    case "cancelled":
      return [];
  }
}

function toCreatedAtMs(value: OrderRecord["createdAt"]): number {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return 0;
}

function formatOrderTime(createdAtMs: number): string {
  if (createdAtMs <= 0) {
    return "Sin hora";
  }

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAtMs));
}

function mapSelectedOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option): string[] => {
    if (!option || typeof option !== "object") {
      return [];
    }

    const record = option as SelectedOptionRecord;

    if (!isNonEmptyString(record.optionName) || !Array.isArray(record.valueLabels)) {
      return [];
    }

    const values = record.valueLabels.filter(isNonEmptyString).map((label) => label.trim());

    return values.length > 0 ? [`${record.optionName.trim()}: ${values.join(", ")}`] : [];
  });
}

function mapProducts(value: unknown): TenantDashboardProductSummary[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const products: TenantDashboardProductSummary[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as OrderProductRecord;

    if (
      !isNonEmptyString(record.id) ||
      !isNonEmptyString(record.nombre) ||
      !isFiniteNumber(record.precio) ||
      !isFiniteNumber(record.cantidad)
    ) {
      return null;
    }

    products.push({
      id: record.id.trim(),
      name: record.nombre.trim(),
      quantity: record.cantidad,
      lineTotal: record.precio * record.cantidad,
      options: mapSelectedOptions(record.selectedOptions),
    });
  }

  return products;
}

export function mapTenantOrder(
  documentId: string,
  expectedTenantId: string,
  value: unknown
): TenantDashboardOrder | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as OrderRecord;
  const products = mapProducts(record.productos);

  if (
    !products ||
    !record.cliente ||
    !isNonEmptyString(record.cliente.nombre) ||
    !isNonEmptyString(record.cliente.telefono) ||
    !isNonEmptyString(record.tenantId) ||
    record.tenantId.trim() !== expectedTenantId ||
    !isFiniteNumber(record.total) ||
    !isOrderState(record.estado)
  ) {
    return null;
  }

  const createdAtMs = toCreatedAtMs(record.createdAt);

  return {
    id: isNonEmptyString(record.orderId) ? record.orderId.trim() : documentId,
    tenantId: expectedTenantId,
    customerName: record.cliente.nombre.trim(),
    customerPhone: record.cliente.telefono.trim(),
    total: record.total,
    status: mapDashboardStatus(record.estado),
    sourceState: record.estado,
    createdAtMs,
    createdAtLabel: formatOrderTime(createdAtMs),
    products,
  };
}

export function getProductSummary(products: TenantDashboardProductSummary[]): string {
  return products
    .map((product) => `${product.quantity} x ${product.name}`)
    .join(", ");
}

export function getDashboardMetrics(
  orders: TenantDashboardOrder[]
): TenantDashboardMetrics {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter(
    (order) => order.createdAtMs >= todayStart.getTime()
  );

  return {
    ordersToday: todaysOrders.length,
    newOrders: todaysOrders.filter((order) => order.status === "new").length,
    preparingOrders: todaysOrders.filter((order) => order.status === "preparing").length,
    readyOrders: todaysOrders.filter((order) => order.status === "ready").length,
    deliveredOrders: todaysOrders.filter((order) => order.status === "delivered").length,
    estimatedSalesToday: todaysOrders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.total, 0),
  };
}
