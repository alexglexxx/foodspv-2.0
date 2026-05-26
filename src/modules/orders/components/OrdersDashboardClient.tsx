"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

import type { Order } from "../types/order";

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapOrderDocument(
  document: QueryDocumentSnapshot
): Order & { orderId: string; createdAtLabel: string | null } | null {
  const record = document.data() as FirestoreOrderRecord;

  if (
    !record.cliente ||
    !isNonEmptyString(record.cliente.nombre) ||
    !isNonEmptyString(record.cliente.telefono) ||
    !Array.isArray(record.productos) ||
    !isValidNumber(record.total) ||
    !isNonEmptyString(record.estado) ||
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
    estado: record.estado.trim() as Order["estado"],
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

function getStatusLabel(status: Order["estado"]): string {
  switch (status) {
    case "pendiente":
      return "Pendiente";
    case "preparando":
      return "Preparando";
    case "listo":
      return "Listo";
    case "entregado":
      return "Entregado";
    default:
      return status;
  }
}

export function OrdersDashboardClient({
  tenantId,
}: OrdersDashboardClientProps) {
  const [orders, setOrders] = useState<
    Array<Order & { orderId: string; createdAtLabel: string | null }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          .filter(
            (
              order
            ): order is Order & {
              orderId: string;
              createdAtLabel: string | null;
            } => order !== null
          );

        setOrders(nextOrders);
        setIsLoading(false);
      },
      (error) => {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

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
            productos, total y estado.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-stone-200">
            tenantId: {tenantId}
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

          {errorMessage ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              No se pudo leer `tenants/{tenantId}/orders`: {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && orders.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500 shadow-sm">
              No hay pedidos todavía para este tenant.
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
                    <p className="mt-2 text-lg font-semibold">
                      {getStatusLabel(order.estado)}
                    </p>
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
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
