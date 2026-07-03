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
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/client";
import type { OrderFlowMode } from "@/types/tenant.types";

import {
  getAvailableOrderStateTransitions,
  getOrderStateLabel,
  isOrderState,
} from "../agents/orderStateAgent";
import type { DeliveryAddressDetails, Order, OrderState } from "../types/order";
import type { SelectedProductOption } from "@/types/product.types";

interface OrdersDashboardClientProps {
  requestedTenantId?: string | null;
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
  name?: unknown;
  slug?: unknown;
  active?: unknown;
  status?: unknown;
  whatsappPhone?: unknown;
  metaPhoneNumberId?: unknown;
  whatsappActive?: unknown;
  whatsappWebhookActive?: unknown;
  whatsappWebhookStatus?: unknown;
  orderFlowMode?: unknown;
}

interface TenantDashboardRecord {
  name: string;
  slug: string;
  active: boolean;
  whatsappPhone: string | null;
  metaPhoneNumberId: string | null;
  whatsappActive: boolean;
  whatsappWebhookReady: boolean;
}

interface ProductDashboardRecord {
  id: string;
  name: string;
  price: number | null;
  active: boolean;
  available: boolean;
  deleted: boolean;
  imageReady: boolean;
}

interface FirestoreProductRecord {
  name?: unknown;
  price?: unknown;
  active?: unknown;
  available?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  deletedAt?: unknown;
}

type InternalUserRole = "superadmin" | "tenant_admin" | "employee";

interface UserRoleRecord {
  role?: unknown;
  tenantId?: unknown;
  active?: unknown;
}

interface UserRoleProfile {
  role: InternalUserRole;
  tenantId: string | null;
  active: boolean;
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

const DASHBOARD_WIDGETS = [
  { id: "metrics", label: "Metricas" },
  { id: "actions", label: "Accesos" },
  { id: "activity", label: "Actividad" },
  { id: "alerts", label: "Alertas" },
  { id: "orders", label: "Pedidos" },
] as const;

type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];

type DashboardWidgetConfig = Record<DashboardWidgetId, boolean>;

const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  metrics: true,
  actions: true,
  activity: true,
  alerts: true,
  orders: true,
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

function isDeleted(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

function isInternalUserRole(value: unknown): value is InternalUserRole {
  return (
    value === "superadmin" ||
    value === "tenant_admin" ||
    value === "employee"
  );
}

function mapUserRoleProfile(value: unknown): UserRoleProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as UserRoleRecord;

  if (!isInternalUserRole(record.role)) {
    return null;
  }

  return {
    role: record.role,
    tenantId: isNonEmptyString(record.tenantId)
      ? record.tenantId.trim()
      : null,
    active: record.active !== false,
  };
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

function getStoredWidgetConfig(): DashboardWidgetConfig {
  if (typeof window === "undefined") {
    return DEFAULT_WIDGET_CONFIG;
  }

  try {
    const stored = window.localStorage.getItem("foodspv_admin_widgets");
    const parsed = stored ? (JSON.parse(stored) as Partial<DashboardWidgetConfig>) : {};

    return {
      ...DEFAULT_WIDGET_CONFIG,
      ...Object.fromEntries(
        DASHBOARD_WIDGETS.map((widget) => [
          widget.id,
          typeof parsed[widget.id] === "boolean"
            ? parsed[widget.id]
            : DEFAULT_WIDGET_CONFIG[widget.id],
        ])
      ),
    } as DashboardWidgetConfig;
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

function mapTenantRecord(
  tenantId: string,
  record: TenantRecord
): TenantDashboardRecord {
  const status = isNonEmptyString(record.status) ? record.status.trim() : "";
  const active = record.active !== false && status !== "inactive";
  const whatsappPhone = isNonEmptyString(record.whatsappPhone)
    ? record.whatsappPhone.trim()
    : null;
  const metaPhoneNumberId = isNonEmptyString(record.metaPhoneNumberId)
    ? record.metaPhoneNumberId.trim()
    : null;
  const webhookStatus = isNonEmptyString(record.whatsappWebhookStatus)
    ? record.whatsappWebhookStatus.trim()
    : "";

  return {
    name: isNonEmptyString(record.name) ? record.name.trim() : "Negocio",
    slug: isNonEmptyString(record.slug) ? record.slug.trim() : tenantId,
    active,
    whatsappPhone,
    metaPhoneNumberId,
    whatsappActive: record.whatsappActive !== false,
    whatsappWebhookReady:
      record.whatsappWebhookActive === true || webhookStatus === "active",
  };
}

function mapProductDocument(
  document: QueryDocumentSnapshot
): ProductDashboardRecord {
  const record = document.data() as FirestoreProductRecord;
  const active = typeof record.active === "boolean" ? record.active : true;
  const images = Array.isArray(record.images) ? record.images : [];
  const imageReady =
    isNonEmptyString(record.imageUrl) ||
    images.some((image) => {
      if (!image || typeof image !== "object") {
        return false;
      }

      return isNonEmptyString((image as { url?: unknown }).url);
    });

  return {
    id: document.id,
    name: isNonEmptyString(record.name) ? record.name.trim() : "Producto sin nombre",
    price: isValidNumber(record.price) ? record.price : null,
    active,
    available: typeof record.available === "boolean" ? record.available : active,
    deleted: isDeleted(record.deletedAt),
    imageReady,
  };
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
  requestedTenantId,
}: OrdersDashboardClientProps) {
  const supportTenantId =
    requestedTenantId && isValidTenantId(requestedTenantId)
      ? requestedTenantId
      : null;
  const [tenant, setTenant] = useState<TenantDashboardRecord | null>(null);
  const [products, setProducts] = useState<ProductDashboardRecord[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [productsErrorMessage, setProductsErrorMessage] = useState<string | null>(
    null
  );
  const [ordersErrorMessage, setOrdersErrorMessage] = useState<string | null>(
    null
  );
  const [tenantFlowErrorMessage, setTenantFlowErrorMessage] = useState<
    string | null
  >(null);
  const [tenantOrderFlowMode, setTenantOrderFlowMode] =
    useState<OrderFlowMode>("simple_whatsapp");
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfileReady, setUserProfileReady] = useState<boolean>(false);
  const [userProfileErrorMessage, setUserProfileErrorMessage] = useState<
    string | null
  >(null);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [activeUserRole, setActiveUserRole] = useState<InternalUserRole | null>(
    null
  );
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(
    null
  );
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [widgetConfig, setWidgetConfig] =
    useState<DashboardWidgetConfig>(getStoredWidgetConfig);
  const [dashboardNow, setDashboardNow] = useState<number>(0);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<
    Record<string, boolean>
  >({});
  const [orderActionErrors, setOrderActionErrors] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
      setUserProfileReady(false);
      setUserProfileErrorMessage(null);
      setActiveTenantId(null);
      setActiveUserRole(null);
      setTenant(null);
      setProducts([]);
      setOrders([]);
      setOrdersErrorMessage(null);
      setProductsErrorMessage(null);
      setTenantFlowErrorMessage(null);
      setIsLoading(false);

      if (nextUser) {
        setLoginErrorMessage(null);
      }
    });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDashboardNow(Date.now()), 0);
    const interval = window.setInterval(
      () => setDashboardNow(Date.now()),
      60 * 1000
    );

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!firebaseUser) {
      return;
    }

    const userRef = doc(db, "users", firebaseUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setActiveTenantId(null);
          setActiveUserRole(null);
          setUserProfileErrorMessage("Usuario no autorizado.");
          setTenant(null);
          setProducts([]);
          setOrders([]);
          setUserProfileReady(true);
          return;
        }

        const profile = mapUserRoleProfile(snapshot.data());

        if (!profile) {
          setActiveTenantId(null);
          setActiveUserRole(null);
          setUserProfileErrorMessage("Perfil de usuario inválido.");
          setTenant(null);
          setProducts([]);
          setOrders([]);
          setUserProfileReady(true);
          return;
        }

        if (!profile.active) {
          setActiveTenantId(null);
          setActiveUserRole(profile.role);
          setUserProfileErrorMessage("Usuario inactivo.");
          setTenant(null);
          setProducts([]);
          setOrders([]);
          setUserProfileReady(true);
          return;
        }

        if (profile.role === "superadmin") {
          setActiveUserRole(profile.role);
          setActiveTenantId(supportTenantId);
          setIsLoading(supportTenantId !== null);
          setUserProfileErrorMessage(
            supportTenantId
              ? null
              : "El superadmin conserva su dashboard separado en /superadmin."
          );
          if (!supportTenantId) {
            setTenant(null);
            setProducts([]);
            setOrders([]);
          }
          setUserProfileReady(true);
          return;
        }

        if (!profile.tenantId || !isValidTenantId(profile.tenantId)) {
          setActiveTenantId(null);
          setActiveUserRole(profile.role);
          setUserProfileErrorMessage(
            "Este usuario no tiene un tenant activo asignado."
          );
          setTenant(null);
          setProducts([]);
          setOrders([]);
          setUserProfileReady(true);
          return;
        }

        setActiveUserRole(profile.role);
        setActiveTenantId(profile.tenantId);
        setIsLoading(true);
        setUserProfileErrorMessage(null);
        setUserProfileReady(true);
      },
      (error) => {
        setActiveTenantId(null);
        setActiveUserRole(null);
        setUserProfileErrorMessage(error.message);
        setTenant(null);
        setProducts([]);
        setOrders([]);
        setUserProfileReady(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authReady, firebaseUser, supportTenantId]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!firebaseUser || !activeTenantId) {
      return;
    }

    const ordersQuery = query(
      collection(db, "tenants", activeTenantId, "orders"),
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
  }, [authReady, firebaseUser, activeTenantId]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !activeTenantId) {
      return;
    }

    const tenantRef = doc(db, "tenants", activeTenantId);

    const unsubscribe = onSnapshot(
      tenantRef,
      (snapshot) => {
        const tenantRecord = (snapshot.data() ?? {}) as TenantRecord;

        setTenant(mapTenantRecord(activeTenantId, tenantRecord));
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
  }, [authReady, firebaseUser, activeTenantId]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !activeTenantId) {
      return;
    }

    const productsQuery = query(
      collection(db, "tenants", activeTenantId, "products")
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        setProducts(snapshot.docs.map((document) => mapProductDocument(document)));
        setProductsErrorMessage(null);
      },
      (error) => {
        setProductsErrorMessage(error.message);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [authReady, firebaseUser, activeTenantId]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setLoginErrorMessage(null);

    try {
      await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );
      setLoginPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo iniciar sesión.";

      setLoginErrorMessage(message);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleStateChange(
    orderId: string,
    nextState: OrderState
  ): Promise<void> {
    if (!firebaseUser || !activeTenantId) {
      setOrderActionErrors((current) => ({
        ...current,
        [orderId]: "Sesión y tenant activo requeridos.",
      }));
      return;
    }

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
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: activeTenantId,
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

  function handleWidgetToggle(widgetId: DashboardWidgetId): void {
    setWidgetConfig((current) => {
      const nextConfig = {
        ...current,
        [widgetId]: !current[widgetId],
      };

      window.localStorage.setItem(
        "foodspv_admin_widgets",
        JSON.stringify(nextConfig)
      );

      return nextConfig;
    });
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

  const dashboardMetrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    const todaysOrders = orders.filter((order) => order.createdAt >= todayStartTime);
    const billableTodaysOrders = todaysOrders.filter(
      (order) => order.estado !== "cancelado"
    );
    const salesToday = billableTodaysOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const pendingOrders = orders.filter((order) =>
      ["requires_confirmation", "pendiente", "preparando", "listo"].includes(
        order.estado
      )
    );
    const completedToday = todaysOrders.filter(
      (order) => order.estado === "entregado"
    );

    return {
      ordersToday: todaysOrders.length,
      salesToday,
      pendingOrders: pendingOrders.length,
      completedOrders: completedToday.length,
      averageTicket:
        billableTodaysOrders.length > 0
          ? salesToday / billableTodaysOrders.length
          : 0,
    };
  }, [orders]);

  const activeProducts = useMemo(
    () => products.filter((product) => !product.deleted && product.active),
    [products]
  );
  const productsWithoutPrice = useMemo(
    () =>
      activeProducts.filter(
        (product) => product.price === null || product.price <= 0
      ),
    [activeProducts]
  );
  const productsWithoutImage = useMemo(
    () => activeProducts.filter((product) => !product.imageReady),
    [activeProducts]
  );
  const oldPendingOrders = useMemo(() => {
    const maxPendingAge = dashboardNow - 30 * 60 * 1000;

    return orders.filter(
      (order) =>
        ["requires_confirmation", "pendiente"].includes(order.estado) &&
        dashboardNow > 0 &&
        order.createdAt > 0 &&
        order.createdAt < maxPendingAge
    );
  }, [dashboardNow, orders]);
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const whatsappConfigured =
    tenant !== null &&
    tenant.whatsappActive &&
    tenant.whatsappPhone !== null &&
    tenant.metaPhoneNumberId !== null;
  const publicStorePath = `/${tenant?.slug ?? activeTenantId ?? ""}`;
  const operationalAlerts = [
    ...(tenant && !whatsappConfigured
      ? [
          {
            title: "WhatsApp incompleto",
            detail: "Falta teléfono, phone_number_id o la integración está pausada.",
          },
        ]
      : []),
    ...(tenant && !tenant.active
      ? [
          {
            title: "Negocio pausado",
            detail: "La tienda pública no debería recibir pedidos hasta reactivarse.",
          },
        ]
      : []),
    ...(productsWithoutPrice.length > 0
      ? [
          {
            title: "Productos sin precio",
            detail: `${productsWithoutPrice.length} productos activos necesitan precio.`,
          },
        ]
      : []),
    ...(productsWithoutImage.length > 0
      ? [
          {
            title: "Productos sin imagen",
            detail: `${productsWithoutImage.length} productos activos necesitan imagen.`,
          },
        ]
      : []),
    ...(oldPendingOrders.length > 0
      ? [
          {
            title: "Pedidos pendientes antiguos",
            detail: `${oldPendingOrders.length} pedidos llevan más de 30 minutos sin confirmarse.`,
          },
        ]
      : []),
  ];

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            FoodSPV Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Validando sesión</h1>
        </section>
      </main>
    );
  }

  if (!firebaseUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <form
          className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl"
          onSubmit={(event) => void handleSignIn(event)}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            FoodSPV Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Acceso interno</h1>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-stone-700">
              Email
              <input
                className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500"
                onChange={(event) => setLoginEmail(event.target.value)}
                type="email"
                value={loginEmail}
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Password
              <input
                className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500"
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                value={loginPassword}
              />
            </label>
          </div>
          {loginErrorMessage ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loginErrorMessage}
            </p>
          ) : null}
          <button
            className="mt-6 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={isSigningIn}
            type="submit"
          >
            {isSigningIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  if (!userProfileReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            FoodSPV Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Validando permisos</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Buscando el tenant asignado a tu usuario.
          </p>
        </section>
      </main>
    );
  }

  if (userProfileErrorMessage || !activeTenantId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <section className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            FoodSPV Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            No hay tenant operativo
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {userProfileErrorMessage ??
              "Este usuario no tiene un negocio asignado."}
          </p>
          {activeUserRole === "superadmin" ? (
            <Link
              className="mt-5 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
              href="/superadmin"
            >
              Abrir superadmin
            </Link>
          ) : null}
          <button
            className="mt-5 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
            onClick={() => void signOut(auth)}
            type="button"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  const resolvedTenantId = activeTenantId;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                FoodSPV Admin
              </p>
              <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                {tenant?.name ?? "Dashboard del negocio"}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span
                  className={`rounded-full px-3 py-1 ${
                    tenant?.active
                      ? "bg-emerald-400/15 text-emerald-100"
                      : "bg-rose-400/15 text-rose-100"
                  }`}
                >
                  {tenant?.active ? "Activo" : "Inactivo"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    whatsappConfigured
                      ? "bg-sky-400/15 text-sky-100"
                      : "bg-amber-400/15 text-amber-100"
                  }`}
                >
                  WhatsApp {whatsappConfigured ? "configurado" : "incompleto"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                  {tenantOrderFlowMode}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                href={publicStorePath}
                target="_blank"
              >
                Abrir tienda pública
              </Link>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void signOut(auth)}
                type="button"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Configuración de widgets
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Muestra u oculta bloques del dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {DASHBOARD_WIDGETS.map((widget) => (
                <label
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  key={widget.id}
                >
                  <input
                    checked={widgetConfig[widget.id]}
                    className="size-4 accent-slate-950"
                    onChange={() => handleWidgetToggle(widget.id)}
                    type="checkbox"
                  />
                  {widget.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        {widgetConfig.metrics ? (
          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            id="metricas"
          >
            <MetricCard label="Pedidos de hoy" value={dashboardMetrics.ordersToday} />
            <MetricCard
              label="Ventas de hoy"
              value={formatCurrency(dashboardMetrics.salesToday)}
            />
            <MetricCard
              label="Pendientes"
              value={dashboardMetrics.pendingOrders}
            />
            <MetricCard
              label="Completados"
              value={dashboardMetrics.completedOrders}
            />
            <MetricCard
              label="Ticket promedio"
              value={formatCurrency(dashboardMetrics.averageTicket)}
            />
          </section>
        ) : null}

        {widgetConfig.actions ? (
          <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            id="acciones"
          >
            <h2 className="text-base font-semibold text-slate-950">
              Accesos rápidos
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <QuickAction href="#pedidos" label="Ver pedidos" />
              <QuickAction href="#menu" label="Agregar producto" />
              <QuickAction href="#menu" label="Administrar menú" />
              <QuickAction href="#configuracion" label="Configurar negocio" />
              <QuickAction href="#whatsapp" label="Revisar WhatsApp" />
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          {widgetConfig.activity ? (
            <section
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              id="actividad"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  Actividad reciente
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Últimos pedidos
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Cuando entre el primer pedido verás hora, cliente, total y
                  estado aquí.
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[0.8fr_1fr_0.8fr_0.9fr] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                    <span>Hora</span>
                    <span>Cliente</span>
                    <span>Total</span>
                    <span>Estado</span>
                  </div>
                  {recentOrders.map((order) => (
                    <div
                      className="grid grid-cols-[0.8fr_1fr_0.8fr_0.9fr] gap-2 border-t border-slate-200 px-3 py-3 text-sm"
                      key={order.orderId}
                    >
                      <span className="min-w-0 truncate text-slate-600">
                        {order.createdAtLabel ?? "Sin hora"}
                      </span>
                      <span className="min-w-0 truncate font-semibold text-slate-950">
                        {order.cliente.nombre}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="min-w-0 truncate text-slate-600">
                        {getOrderStateLabel(order.estado)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {widgetConfig.alerts ? (
            <section
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              id="alertas"
            >
              <h2 className="text-base font-semibold text-slate-950">
                Alertas operativas
              </h2>

              {operationalAlerts.length === 0 ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  Sin alertas críticas por ahora.
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {operationalAlerts.map((alert) => (
                    <div
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                      key={alert.title}
                    >
                      <p className="text-sm font-semibold text-amber-950">
                        {alert.title}
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        {alert.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            id="menu"
          >
            <h2 className="text-base font-semibold text-slate-950">
              Menú
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <StatusBox label="Productos activos" value={activeProducts.length} />
              <StatusBox
                label="Disponibles"
                value={activeProducts.filter((product) => product.available).length}
              />
              <StatusBox label="Sin precio" value={productsWithoutPrice.length} />
              <StatusBox label="Sin imagen" value={productsWithoutImage.length} />
            </div>
            {productsErrorMessage ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                No se pudieron cargar productos: {productsErrorMessage}
              </p>
            ) : null}
          </section>

          <section
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            id="whatsapp"
          >
            <h2 className="text-base font-semibold text-slate-950">
              WhatsApp
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              <StatusRow
                label="Teléfono"
                value={tenant?.whatsappPhone ?? "Falta configurar"}
              />
              <StatusRow
                label="Phone number ID"
                value={tenant?.metaPhoneNumberId ? "Configurado" : "Falta configurar"}
              />
              <StatusRow
                label="Webhook"
                value={tenant?.whatsappWebhookReady ? "Activo" : "No confirmado"}
              />
            </div>
          </section>
        </div>

        <section
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          id="configuracion"
        >
          <h2 className="text-base font-semibold text-slate-950">
            Configuración del negocio
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <StatusBox label="tenantId" value={resolvedTenantId} />
            <StatusBox label="Rol" value={activeUserRole ?? "Sin rol"} />
            <StatusBox
              label="Tienda pública"
              value={tenant?.slug ? `/${tenant.slug}` : publicStorePath}
            />
          </div>
        </section>

        {widgetConfig.orders ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="pedidos">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Pedidos
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  Operación en vivo
                </h2>
              </div>
              <span className="text-sm font-semibold text-slate-500">
                {orders.length} pedidos cargados
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Cargando pedidos en tiempo real...
              </div>
            ) : null}

            {ordersErrorMessage ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                No se pudo leer `tenants/{resolvedTenantId}/orders`:{" "}
                {ordersErrorMessage}
              </div>
            ) : null}

            {tenantFlowErrorMessage ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                No se pudo leer `tenants/{resolvedTenantId}` para resolver
                `orderFlowMode`: {tenantFlowErrorMessage}
              </div>
            ) : null}

            {!isLoading && !ordersErrorMessage && orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No hay pedidos todavía. Cuando un cliente compre desde la tienda,
                aparecerá aquí con sus productos, modificadores y dirección.
              </div>
            ) : null}

            {!isLoading && !ordersErrorMessage && orders.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {KANBAN_COLUMNS.map((column) => {
                  const columnOrders = ordersByState.get(column.state) ?? [];

                  return (
                    <section
                      key={column.state}
                      className="flex min-h-80 flex-col rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="border-b border-slate-200 pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-950">
                            {column.title}
                          </h3>
                          <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                            {columnOrders.length}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {column.description}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-1 flex-col gap-3">
                        {columnOrders.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm font-semibold text-slate-400">
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
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function formatDeliveryLabel(order: DashboardOrder): string {
  return order.deliveryType === "delivery"
    ? "Entrega a domicilio"
    : "Recoger pedido";
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
      href={href}
    >
      {label}
    </Link>
  );
}

function StatusBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-950">
        {value}
      </span>
    </div>
  );
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
