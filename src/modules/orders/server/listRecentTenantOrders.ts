import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type { OrderState, OrderTotalMode } from "../types/order";

export interface RecentTenantOrderItemSummary {
  nombre: string;
  cantidad: number;
}

export interface RecentTenantOrderSummary {
  orderId: string;
  createdAt: Date | null;
  clienteNombre: string;
  clienteTelefono: string;
  customerCode: string | null;
  productos: RecentTenantOrderItemSummary[];
  total: number | null;
  hasQuoteItems: boolean;
  totalMode: OrderTotalMode;
  estado: OrderState | string;
}

interface FirestoreOrderRecord {
  customerCode?: unknown;
  customer?: {
    customerCode?: unknown;
  };
  cliente?: {
    nombre?: unknown;
    telefono?: unknown;
    customerCode?: unknown;
  };
  productos?: Array<{
    nombre?: unknown;
    cantidad?: unknown;
  }>;
  total?: unknown;
  hasQuoteItems?: unknown;
  totalMode?: unknown;
  estado?: unknown;
  orderState?: unknown;
  createdAt?: Timestamp | { toDate?: () => Date } | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

function mapRecentOrder(
  orderId: string,
  record: FirestoreOrderRecord
): RecentTenantOrderSummary {
  const customerCode =
    isNonEmptyString(record.customerCode)
      ? record.customerCode.trim()
      : isNonEmptyString(record.customer?.customerCode)
        ? record.customer.customerCode.trim()
        : isNonEmptyString(record.cliente?.customerCode)
          ? record.cliente.customerCode.trim()
          : null;
  const productos = Array.isArray(record.productos)
    ? record.productos.flatMap((producto): RecentTenantOrderItemSummary[] => {
        if (
          !producto ||
          typeof producto !== "object" ||
          !isNonEmptyString(producto.nombre) ||
          !isFiniteNumber(producto.cantidad)
        ) {
          return [];
        }

        return [
          {
            nombre: producto.nombre.trim(),
            cantidad: producto.cantidad,
          },
        ];
      })
    : [];

  return {
    orderId,
    createdAt: toDate(record.createdAt),
    clienteNombre: isNonEmptyString(record.cliente?.nombre)
      ? record.cliente.nombre.trim()
      : "Cliente",
    clienteTelefono: isNonEmptyString(record.cliente?.telefono)
      ? record.cliente.telefono.trim()
      : "Sin teléfono",
    customerCode,
    productos,
    total: isFiniteNumber(record.total) ? record.total : null,
    hasQuoteItems: record.hasQuoteItems === true,
    totalMode:
      record.totalMode === "partial_quote" || record.totalMode === "quote_only"
        ? record.totalMode
        : "fixed",
    estado: isNonEmptyString(record.orderState)
      ? record.orderState.trim()
      : isNonEmptyString(record.estado)
        ? record.estado.trim()
        : "pendiente",
  };
}

export async function listRecentTenantOrders(
  tenantId: string,
  limit: number
): Promise<RecentTenantOrderSummary[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 3);
  const snapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("orders")
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((document) =>
    mapRecentOrder(document.id, (document.data() ?? {}) as FirestoreOrderRecord)
  );
}
