"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { DeliveryAddressDetails, Order, OrderState } from "../types/order";
import type { SelectedProductOption } from "@/types/product.types";

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
    selectedOptions?: unknown;
  }>;
  total?: unknown;
  deliveryType?: unknown;
  deliveryAddress?: unknown;
  deliveryAddressDetails?: unknown;
  deliveryFee?: unknown;
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

const KANBAN_COLUMNS: Array<{
  state: OrderState;
  title: string;
  description: string;
}> = [
  {
    state: "pendiente",
    title: "Pedidos Nuevos",
    description: "Ordenes recien recibidas.",
  },
  {
    state: "preparando",
    title: "Pedidos Preparando",
    description: "Cocina trabajando en estas ordenes.",
  },
  {
    state: "listo",
    title: "Pedidos Listos",
    description: "Listos para entrega o recoleccion.",
  },
  {
    state: "entregado",
    title: "Pedidos Entregados",
    description: "Cerrados por operacion.",
  },
];

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

function mapSelectedOptions(value: unknown): SelectedProductOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option): SelectedProductOption[] => {
    if (!option || typeof option !== "object") {
      return [];
    }

    const record = option as {
      optionId?: unknown;
      optionName?: unknown;
      valueIds?: unknown;
      valueLabels?: unknown;
      priceDeltaTotal?: unknown;
    };

    if (
      !isNonEmptyString(record.optionId) ||
      !isNonEmptyString(record.optionName) ||
      !Array.isArray(record.valueIds) ||
      !Array.isArray(record.valueLabels) ||
      !isValidNumber(record.priceDeltaTotal)
    ) {
      return [];
    }

    const valueIds = record.valueIds.filter(isNonEmptyString);
    const valueLabels = record.valueLabels.filter(isNonEmptyString);

    if (valueIds.length === 0 || valueLabels.length === 0) {
      return [];
    }

    return [
      {
        optionId: record.optionId.trim(),
        optionName: record.optionName.trim(),
        valueIds: valueIds.map((valueId) => valueId.trim()),
        valueLabels: valueLabels.map((label) => label.trim()),
        priceDeltaTotal: record.priceDeltaTotal,
      },
    ];
  });
}

function mapDeliveryAddressDetails(value: unknown): DeliveryAddressDetails | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    !isNonEmptyString(record.street) ||
    !isNonEmptyString(record.number) ||
    !isNonEmptyString(record.neighborhood) ||
    !isNonEmptyString(record.reference)
  ) {
    return undefined;
  }

  return {
    street: record.street.trim(),
    number: record.number.trim(),
    neighborhood: record.neighborhood.trim(),
    reference: record.reference.trim(),
  };
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
        selectedOptions: mapSelectedOptions(producto.selectedOptions),
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
        selectedOptions: SelectedProductOption[];
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
    deliveryType:
      record.deliveryType === "delivery" || record.deliveryType === "pickup"
        ? record.deliveryType
        : undefined,
    deliveryAddress: isNonEmptyString(record.deliveryAddress)
      ? record.deliveryAddress.trim()
      : undefined,
    deliveryAddressDetails: mapDeliveryAddressDetails(
      record.deliveryAddressDetails
    ),
    deliveryFee: isValidNumber(record.deliveryFee) ? record.deliveryFee : undefined,
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

  const ordersByState = useMemo(() => {
    const groups = new Map<OrderState, DashboardOrder[]>();

    for (const column of KANBAN_COLUMNS) {
      groups.set(column.state, []);
    }

    for (const order of orders) {
      const columnState =
        order.estado === "requires_confirmation" ? "pendiente" : order.estado;
      const currentOrders = groups.get(columnState) ?? [];

      groups.set(columnState, [...currentOrders, order]);
    }

    return groups;
  }, [orders]);

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

          {!isLoading && !ordersErrorMessage && orders.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-4">
              <div className="grid min-w-[960px] grid-cols-4 gap-4 xl:min-w-0">
                {KANBAN_COLUMNS.map((column) => {
                  const columnOrders = ordersByState.get(column.state) ?? [];

                  return (
                    <section
                      key={column.state}
                      className="flex min-h-[30rem] flex-col rounded-[1.5rem] border border-stone-200 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="border-b border-stone-200 pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-black text-stone-950">
                            {column.title}
                          </h3>
                          <span className="rounded-full bg-stone-950 px-2.5 py-1 text-xs font-black text-white">
                            {columnOrders.length}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">
                          {column.description}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-1 flex-col gap-3">
                        {columnOrders.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm font-semibold text-stone-400">
                            Sin pedidos en esta columna.
                          </div>
                        ) : null}

                        {columnOrders.map((order) => (
                          <OrderKanbanCard
                            key={order.orderId}
                            order={order}
                            isUpdating={
                              updatingOrderIds[order.orderId] === true
                            }
                            errorMessage={orderActionErrors[order.orderId]}
                            onStateChange={handleStateChange}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function formatDeliveryLabel(order: DashboardOrder): string {
  return order.deliveryType === "delivery"
    ? "📍 Entrega a domicilio"
    : "🏪 Recoger pedido";
}

function formatDeliveryAddress(order: DashboardOrder): string | null {
  if (order.deliveryType !== "delivery") {
    return null;
  }

  if (order.deliveryAddressDetails) {
    return [
      `Calle: ${order.deliveryAddressDetails.street}`,
      `Numero: ${order.deliveryAddressDetails.number}`,
      `Colonia: ${order.deliveryAddressDetails.neighborhood}`,
      `Referencia: ${order.deliveryAddressDetails.reference}`,
    ].join(" · ");
  }

  return order.deliveryAddress ?? null;
}

function OrderKanbanCard({
  order,
  isUpdating,
  errorMessage,
  onStateChange,
}: {
  order: DashboardOrder;
  isUpdating: boolean;
  errorMessage?: string | null;
  onStateChange: (orderId: string, nextState: OrderState) => Promise<void>;
}) {
  const nextStates = getAvailableOrderStateTransitions(order.estado);
  const deliveryAddress = formatDeliveryAddress(order);

  return (
    <article className="rounded-[1.25rem] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            {order.orderId}
          </p>
          <h4 className="mt-2 text-base font-black text-stone-950">
            {order.cliente.nombre}
          </h4>
          <p className="mt-1 text-xs font-semibold text-stone-500">
            {order.cliente.telefono}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${getStatusBadgeClassName(
            order.estado
          )}`}
        >
          {getOrderStateLabel(order.estado)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 rounded-2xl bg-stone-50 p-3 text-xs font-semibold text-stone-600">
        <p>{order.createdAtLabel ?? "Sin hora registrada"}</p>
        <p>{formatDeliveryLabel(order)}</p>
        {deliveryAddress ? <p className="leading-5">{deliveryAddress}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-stone-500">Total</span>
        <span className="text-lg font-black text-stone-950">
          {formatCurrency(order.total)}
        </span>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
          Productos
        </p>
        <ul className="mt-2 space-y-2">
          {order.productos.map((producto) => (
            <li
              key={`${order.orderId}-${producto.id}`}
              className="rounded-2xl bg-stone-50 px-3 py-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-stone-900">
                  {producto.cantidad} x {producto.nombre}
                </p>
                <p className="shrink-0 font-bold text-stone-700">
                  {formatCurrency(producto.cantidad * producto.precio)}
                </p>
              </div>
              {(producto.selectedOptions ?? []).length > 0 ? (
                <div className="mt-1 space-y-1 text-stone-500">
                  {producto.selectedOptions?.map((option) => (
                    <p key={option.optionId}>
                      {option.optionName}: {option.valueLabels.join(", ")}
                    </p>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3">
        {nextStates.length > 0 ? (
          <div className="grid gap-2">
            {nextStates.map((nextState) => (
              <button
                key={`${order.orderId}-${nextState}`}
                type="button"
                onClick={() => void onStateChange(order.orderId, nextState)}
                disabled={isUpdating}
                className="min-h-10 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-800 transition hover:border-stone-950 hover:bg-stone-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {nextState === "cancelado"
                  ? "Cancelar"
                  : `Mover a ${getOrderStateLabel(nextState)}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-stone-400">
            Estado final sin acciones.
          </p>
        )}

        {isUpdating ? (
          <p className="mt-2 text-xs font-semibold text-stone-500">
            Actualizando...
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </article>
  );
}
