"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import type { OrderState } from "@/modules/orders/types/order";

import type {
  TenantBusinessSummary,
  TenantDashboardOrder,
  TenantDashboardStatus,
  TenantOrderAction,
} from "../types";
import {
  ACTION_LABELS,
  ACTION_TARGET_STATE,
  getAvailableTenantOrderActions,
  getDashboardMetrics,
  getDashboardStatusLabel,
  getProductSummary,
  isValidTenantId,
  mapTenantOrder,
  mapTenantSummary,
  mapUserProfile,
  type TenantAdminProfile,
} from "../services/tenantDashboardMappers";

type TenantDashboardLoadState = "auth" | "profile" | "tenant" | "ready";

type StatusUpdateResponse =
  | {
      success: true;
      changed: boolean;
    }
  | {
      success: false;
      message: string;
    };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusClassName(status: TenantDashboardStatus): string {
  switch (status) {
    case "new":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "preparing":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "delivered":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-800";
  }
}

function getPrimaryActionClassName(action: TenantOrderAction): string {
  if (action === "cancel") {
    return "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-700 hover:bg-rose-700 hover:text-white";
  }

  return "border-slate-950 bg-slate-950 text-white hover:border-slate-800 hover:bg-slate-800";
}

export function TenantDashboardClient() {
  const [loadState, setLoadState] = useState<TenantDashboardLoadState>("auth");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TenantAdminProfile | null>(null);
  const [tenant, setTenant] = useState<TenantBusinessSummary | null>(null);
  const [orders, setOrders] = useState<TenantDashboardOrder[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setProfile(null);
      setTenant(null);
      setOrders([]);
      setOrderError(null);
      setActionErrors({});
      setUpdatingOrders({});
      setMessage(null);
      setLoadState(nextUser ? "profile" : "ready");
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    const userRef = doc(db, "users", firebaseUser.uid);

    return onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProfile(null);
          setMessage("Usuario no autorizado.");
          setLoadState("ready");
          return;
        }

        const nextProfile = mapUserProfile(snapshot.data());

        if (!nextProfile) {
          setProfile(null);
          setMessage("Perfil de usuario inválido.");
          setLoadState("ready");
          return;
        }

        if (!nextProfile.active) {
          setProfile(nextProfile);
          setMessage("Usuario inactivo.");
          setLoadState("ready");
          return;
        }

        if (nextProfile.role !== "tenant_admin") {
          setProfile(nextProfile);
          setMessage(
            nextProfile.role === "superadmin"
              ? "El superadmin conserva su panel separado."
              : "Este dashboard está habilitado para tenant_admin."
          );
          setLoadState("ready");
          return;
        }

        if (!nextProfile.tenantId || !isValidTenantId(nextProfile.tenantId)) {
          setProfile(nextProfile);
          setMessage(
            "Este tenant_admin no tiene un tenantId válido asignado en users/{uid}."
          );
          setLoadState("ready");
          return;
        }

        setProfile(nextProfile);
        setMessage(null);
        setLoadState("tenant");
      },
      (error) => {
        setProfile(null);
        setMessage(error.message);
        setLoadState("ready");
      }
    );
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || profile?.role !== "tenant_admin" || !profile.tenantId) {
      return;
    }

    const tenantRef = doc(db, "tenants", profile.tenantId);

    return onSnapshot(
      tenantRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setTenant(null);
          setMessage("El tenant asignado no existe.");
          setLoadState("ready");
          return;
        }

        setTenant(mapTenantSummary(profile.tenantId!, snapshot.data()));
        setMessage(null);
        setLoadState("ready");
      },
      (error) => {
        setTenant(null);
        setMessage(error.message);
        setLoadState("ready");
      }
    );
  }, [firebaseUser, profile]);

  useEffect(() => {
    if (!firebaseUser || profile?.role !== "tenant_admin" || !profile.tenantId) {
      return;
    }

    const ordersQuery = query(
      collection(db, "tenants", profile.tenantId, "orders"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((orderDoc) =>
            mapTenantOrder(orderDoc.id, profile.tenantId!, orderDoc.data())
          )
          .filter((order): order is TenantDashboardOrder => order !== null);

        setOrders(nextOrders);
        setOrderError(null);
      },
      (error) => {
        setOrderError(error.message);
      }
    );
  }, [firebaseUser, profile]);

  const metrics = useMemo(() => getDashboardMetrics(orders), [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 12), [orders]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function updateOrderStatus(
    order: TenantDashboardOrder,
    nextState: OrderState
  ): Promise<void> {
    if (!firebaseUser || profile?.role !== "tenant_admin" || !profile.tenantId) {
      setActionErrors((current) => ({
        ...current,
        [order.id]: "Sesión de tenant_admin requerida.",
      }));
      return;
    }

    setUpdatingOrders((current) => ({ ...current, [order.id]: true }));
    setActionErrors((current) => ({ ...current, [order.id]: null }));

    try {
      const response = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: profile.tenantId,
          orderId: order.id,
          nextState,
        }),
      });
      const result = (await response.json()) as StatusUpdateResponse;

      if (!response.ok || !result.success) {
        setActionErrors((current) => ({
          ...current,
          [order.id]: result.success
            ? "No se pudo actualizar el pedido."
            : result.message,
        }));
      }
    } catch (error) {
      setActionErrors((current) => ({
        ...current,
        [order.id]:
          error instanceof Error ? error.message : "No se pudo actualizar el pedido.",
      }));
    } finally {
      setUpdatingOrders((current) => ({ ...current, [order.id]: false }));
    }
  }

  if (loadState === "auth" || loadState === "profile" || loadState === "tenant") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
        <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            FoodSPV
          </p>
          <h1 className="mt-2 text-xl font-semibold">Cargando dashboard</h1>
        </section>
      </main>
    );
  }

  if (!firebaseUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
        <form
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(event) => void handleSignIn(event)}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            FoodSPV
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Dashboard del negocio</h1>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Email
              <input
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-slate-950"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Password
              <input
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-slate-950"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
          </div>
          {message ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {message}
            </p>
          ) : null}
          <button
            className="mt-5 min-h-12 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSigningIn}
            type="submit"
          >
            {isSigningIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  if (message || !tenant || profile?.role !== "tenant_admin" || !profile.tenantId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            FoodSPV
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Sin acceso al dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {message ?? "No se pudo resolver un tenant_admin con tenant asignado."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile?.role === "superadmin" ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                href="/superadmin"
              >
                Abrir superadmin
              </Link>
            ) : null}
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => void signOut(auth)}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dashboard tenant
              </p>
              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
                {tenant.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span
                  className={`rounded-full px-3 py-1 ${
                    tenant.active
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  }`}
                >
                  {tenant.active ? "Negocio activo" : "Negocio inactivo"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                  Estado: {tenant.status}
                </span>
              </div>
            </div>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => void signOut(auth)}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <MetricCard label="Pedidos hoy" value={metrics.ordersToday} />
          <MetricCard label="Pendientes" value={metrics.newOrders} status="new" />
          <MetricCard
            label="Preparando"
            value={metrics.preparingOrders}
            status="preparing"
          />
          <MetricCard label="Listos" value={metrics.readyOrders} status="ready" />
          <MetricCard
            label="Entregados"
            value={metrics.deliveredOrders}
            status="delivered"
          />
          <MetricCard
            label="Venta estimada"
            value={formatCurrency(metrics.estimatedSalesToday)}
          />
        </section>

        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pedidos recientes
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Operación de hoy</h2>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              {recentOrders.length} recientes
            </span>
          </div>

          {orderError ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              No se pudo leer tenants/{profile.tenantId}/orders: {orderError}
            </p>
          ) : null}

          {!orderError && recentOrders.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              Todavía no hay pedidos para este tenant.
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            {recentOrders.map((order) => (
              <OrderCard
                actionError={actionErrors[order.id]}
                isUpdating={updatingOrders[order.id] === true}
                key={order.id}
                onAction={(action) =>
                  void updateOrderStatus(order, ACTION_TARGET_STATE[action])
                }
                order={order}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status?: TenantDashboardStatus;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold text-slate-950">
        {value}
      </p>
      {status ? (
        <span
          className={`mt-3 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClassName(
            status
          )}`}
        >
          {getDashboardStatusLabel(status)}
        </span>
      ) : null}
    </article>
  );
}

function OrderCard({
  order,
  isUpdating,
  actionError,
  onAction,
}: {
  order: TenantDashboardOrder;
  isUpdating: boolean;
  actionError?: string | null;
  onAction: (action: TenantOrderAction) => void;
}) {
  const actions = getAvailableTenantOrderActions(order.status);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                order.status
              )}`}
            >
              {getDashboardStatusLabel(order.status)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {order.createdAtLabel}
            </span>
          </div>
          <h3 className="mt-3 break-words text-lg font-semibold text-slate-950">
            {order.customerName}
          </h3>
          <p className="mt-1 break-words text-sm font-semibold text-slate-500">
            {order.customerPhone}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(order.total)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">
          {getProductSummary(order.products)}
        </p>
        <div className="mt-2 grid gap-2">
          {order.products.map((product) => (
            <div
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              key={`${order.id}-${product.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-slate-900">
                  {product.quantity} x {product.name}
                </span>
                <span className="shrink-0 font-semibold text-slate-700">
                  {formatCurrency(product.lineTotal)}
                </span>
              </div>
              {product.options.length > 0 ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {product.options.join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <button
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${getPrimaryActionClassName(
              action
            )}`}
            disabled={isUpdating}
            key={`${order.id}-${action}`}
            onClick={() => onAction(action)}
            type="button"
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {actions.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
          Pedido en estado final.
        </p>
      ) : null}

      {isUpdating ? (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Actualizando pedido...
        </p>
      ) : null}

      {actionError ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {actionError}
        </p>
      ) : null}
    </article>
  );
}
