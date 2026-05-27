"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { OrderFlowMode } from "@/types/tenant.types";

import {
  getAvailableOrderStateTransitions,
  getOrderStateLabel,
  isOrderState,
} from "../agents/orderStateAgent";
import type { Order, OrderState } from "../types/order";

interface OrdersDashboardClientProps {
  tenantId: string;
}

interface FirestoreOrderRecord {
  orderId?: unknown;
  tenantId?: unknown;
  cliente?: {
    nombre?: unknown;
    telefono?: unknown;
  };
  productos?: Array<{
    id?: unknown;
    nombre?: unknown;
    precio?: unknown;
    cantidad?: unknown;
  }>;
  total?: unknown;
  estado?: unknown;
  createdAt?: Timestamp | { toDate?: () => Date } | null;
}

interface TenantRecord {
  orderFlowMode?: unknown;
}

type DashboardOrder = Order & {
  orderId: string;
  createdAtLabel: string | null;
};

type UpdateOrderStatusResponse =
  | {
      success: true;
      changed: boolean;
      customerStatusNotificationDelivery: {
        success: boolean;
        error: string | null;
      } | null;
    }
  | {
      success: false;
      message: string;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOrderFlowMode(value: unknown): value is OrderFlowMode {
  return value === "simple_whatsapp" || value === "dashboard_managed";
}

function mapOrderDocument(
  document: QueryDocumentSnapshot
): DashboardOrder | null {
  const record = document.data() as FirestoreOrderRecord;

  if (
    !record.cliente ||
    !isNonEmptyString(record.cliente.nombre) ||
    !isNonEmptyString(record.cliente.telefono) ||
    !Array.isArray(record.productos) ||
    !isValidNumber(record.total) ||
    !isOrderState(record.estado) ||
    !isNonEmptyString(record.tenantId)
  ) {
    return null;
  }

  const productos = record.productos
    .map((producto) => {
      if (
        !isNonEmptyString(producto.id) ||
        !isNonEmptyString(producto.nombre) ||
        !isValidNumber(producto.precio) ||
        !isValidNumber(producto.cantidad)
      ) {
        return null;
      }

      return {
        id: producto.id.trim(),
        nombre: producto.nombre.trim(),
        precio: producto.precio,
        cantidad: producto.cantidad,
      };
    })
    .filter(
      (
        producto
      ): producto is {
        id: string;
        nombre: string;
        precio: number;
        cantidad: number;
      } => producto !== null
    );

  const createdAtDate =
    record.createdAt && typeof record.createdAt.toDate === "function"
      ? record.createdAt.toDate()
      : null;

  return {
    orderId: isNonEmptyString(record.orderId) ? record.orderId.trim() : document.id,
    tenantId: record.tenantId.trim(),
    cliente: {
      nombre: record.cliente.nombre.trim(),
      telefono: record.cliente.telefono.trim(),
    },
    productos,
    total: record.total,
    estado: record.estado,
    createdAt: createdAtDate ? createdAtDate.getTime() : 0,
    createdAtLabel: createdAtDate
      ? new Intl.DateTimeFormat("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(createdAtDate)
      : null,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusBadgeClassName(status: OrderState): string {
  switch (status) {
    case "requires_confirmation":
      return "border border-orange-200 bg-orange-50 text-orange-800";
    case "pendiente":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    case "preparando":
      return "border border-sky-200 bg-sky-50 text-sky-800";
    case "listo":
      return "border border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelado":
      return "border border-rose-200 bg-rose-50 text-rose-800";
    case "entregado":
      return "border border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border border-stone-200 bg-stone-50 text-stone-700";
  }
}

export function OrdersDashboardClient({
  tenantId,
}: OrdersDashboardClientProps) {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ordersErrorMessage, setOrdersErrorMessage] = useState<string | null>(
    null
  );
  const [tenantFlowErrorMessage, setTenantFlowErrorMessage] = useState<
    string | null
  >(null);
  const [tenantOrderFlowMode, setTenantOrderFlowMode] =
    useState<OrderFlowMode>("simple_whatsapp");
  const [updatingOrderIds, setUpdatingOrderIds] = useState<
    Record<string, boolean>
  >({});
  const [orderActionErrors, setOrderActionErrors] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    const ordersQuery = query(
      collection(db, "tenants", tenantId, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((document) => mapOrderDocument(document))
          .filter((order): order is DashboardOrder => order !== null);

        setOrders(nextOrders);
        setOrdersErrorMessage(null);
        setIsLoading(false);
      },
      (error) => {
        setOrdersErrorMessage(error.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  useEffect(() => {
    const tenantRef = doc(db, "tenants", tenantId);

    const unsubscribe = onSnapshot(
      tenantRef,
      (snapshot) => {
        const tenantRecord = (snapshot.data() ?? {}) as TenantRecord;

        setTenantOrderFlowMode(
          isOrderFlowMode(tenantRecord.orderFlowMode)
            ? tenantRecord.orderFlowMode
            : "simple_whatsapp"
        );
        setTenantFlowErrorMessage(null);
      },
      (error) => {
        setTenantFlowErrorMessage(error.message);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  async function handleStateChange(
    orderId: string,
    nextState: OrderState
  ): Promise<void> {
    setUpdatingOrderIds((current) => ({
      ...current,
      [orderId]: true,
    }));
    setOrderActionErrors((current) => ({
      ...current,
      [orderId]: null,
    }));

    try {
      const response = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          orderId,
          nextState,
        }),
      });
      const result = (await response.json()) as UpdateOrderStatusResponse;

      if (!response.ok || !result.success) {
        setOrderActionErrors((current) => ({
          ...current,
          [orderId]: result.success
            ? "No se pudo actualizar el estado del pedido."
            : result.message,
        }));
        return;
      }

      const notificationDelivery = result.customerStatusNotificationDelivery;

      if (notificationDelivery && !notificationDelivery.success) {
        setOrderActionErrors((current) => ({
          ...current,
          [orderId]:
            notificationDelivery.error ??
            "Estado actualizado, pero falló la notificación al cliente.",
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del pedido.";

      setOrderActionErrors((current) => ({
        ...current,
        [orderId]: message,
      }));
    } finally {
      setUpdatingOrderIds((current) => ({
        ...current,
        [orderId]: false,
      }));
    }
  }

  const isDashboardManaged = tenantOrderFlowMode === "dashboard_managed";

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-stone-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
            FoodSPV Admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Dashboard de pedidos en vivo
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
            Escucha en tiempo real los pedidos del tenant y revisa cliente,
            productos, total y estado. Si el tenant usa
            `dashboard_managed`, también puedes avanzar el pedido desde aquí.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-stone-200">
            tenantId: {tenantId}
          </div>
          <div className="mt-4 inline-flex rounded-full bg-amber-300/15 px-4 py-2 text-sm text-amber-100">
            Modo de flujo: {tenantOrderFlowMode}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Pedidos
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-900">
              Órdenes activas del tenant
            </h2>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
              Cargando pedidos en tiempo real...
            </div>
          ) : null}

          {ordersErrorMessage ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              No se pudo leer `tenants/{tenantId}/orders`: {ordersErrorMessage}
            </div>
          ) : null}

          {tenantFlowErrorMessage ? (
            <div className="mt-5 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              No se pudo leer `tenants/{tenantId}` para resolver
              `orderFlowMode`: {tenantFlowErrorMessage}
            </div>
          ) : null}

          {!isLoading && !ordersErrorMessage && orders.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500 shadow-sm">
              No hay pedidos todavía para este tenant.
            </div>
          ) : null}

          {!isLoading && !ordersErrorMessage && !isDashboardManaged ? (
            <div className="mb-5 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
              Este tenant está en modo `simple_whatsapp`. El dashboard muestra
              el estado actual, pero no habilita cambios manuales todavía.
            </div>
          ) : null}

          <div className="space-y-5">
            {orders.map((order) => (
              <article
                key={order.orderId}
                className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                      Pedido
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">
                      {order.orderId}
                    </h3>
                    <p className="mt-2 text-sm text-stone-600">
                      {order.cliente.nombre} · {order.cliente.telefono}
                    </p>
                    {order.createdAtLabel ? (
                      <p className="mt-1 text-sm text-stone-500">
                        Creado: {order.createdAtLabel}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">
                        Creado: sin timestamp todavía
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-stone-950 px-4 py-3 text-white">
                    <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
                      Estado
                    </p>
                    <div
                      className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClassName(
                        order.estado
                      )}`}
                    >
                      {getOrderStateLabel(order.estado)}
                    </div>
                    <p className="mt-3 text-2xl font-semibold">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-stone-800">Productos</p>
                  <ul className="mt-3 space-y-3">
                    {order.productos.map((producto) => (
                      <li
                        key={`${order.orderId}-${producto.id}`}
                        className="flex items-start justify-between gap-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">
                            {producto.nombre}
                          </p>
                          <p className="mt-1 text-stone-500">
                            {producto.cantidad} x {formatCurrency(producto.precio)}
                          </p>
                        </div>
                        <p className="font-semibold text-stone-900">
                          {formatCurrency(producto.cantidad * producto.precio)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-stone-100 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        Acciones de estado
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        {isDashboardManaged
                          ? "Solo se muestran las transiciones válidas para el estado actual."
                          : "Las transiciones manuales se habilitan solo para tenants dashboard_managed."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isDashboardManaged ? (
                        getAvailableOrderStateTransitions(order.estado).length > 0 ? (
                          getAvailableOrderStateTransitions(order.estado).map(
                            (nextState) => (
                              <button
                                key={`${order.orderId}-${nextState}`}
                                type="button"
                                onClick={() =>
                                  void handleStateChange(order.orderId, nextState)
                                }
                                disabled={updatingOrderIds[order.orderId] === true}
                                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-950 hover:bg-stone-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {nextState === "cancelado"
                                  ? "Cancelar pedido"
                                  : `Marcar como ${getOrderStateLabel(
                                      nextState
                                    ).toLowerCase()}`}
                              </button>
                            )
                          )
                        ) : (
                          <span className="text-sm text-stone-500">
                            Estado final sin acciones disponibles.
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-stone-500">
                          Acciones deshabilitadas para este modo.
                        </span>
                      )}
                    </div>
                  </div>

                  {updatingOrderIds[order.orderId] === true ? (
                    <p className="mt-3 text-sm text-stone-500">
                      Actualizando estado en Firestore...
                    </p>
                  ) : null}

                  {orderActionErrors[order.orderId] ? (
                    <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {orderActionErrors[order.orderId]}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
