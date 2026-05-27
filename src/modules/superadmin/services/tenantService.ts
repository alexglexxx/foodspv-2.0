import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import QRCode from "qrcode";

import { adminDb } from "@/lib/firebase-admin";
import type {
  SuperAdminOrderFlowMode,
  SuperAdminTenantInput,
  SuperAdminTenantStats,
  SuperAdminTenantStatus,
  SuperAdminTenantSummary,
} from "../types/superAdmin";

interface TenantRecord {
  tenantId?: unknown;
  active?: unknown;
  deletedAt?: unknown;
  name?: unknown;
  category?: unknown;
  featuredCategory?: unknown;
  description?: unknown;
  greeting?: unknown;
  estimatedTime?: unknown;
  location?: unknown;
  heroImageUrl?: unknown;
  whatsappPhone?: unknown;
  rating?: unknown;
  reviews?: unknown;
  status?: unknown;
  orderFlowMode?: unknown;
  estimatedPreparationMinutes?: unknown;
  publicUrl?: unknown;
  qrCode?: unknown;
}

interface ProductRecord {
  active?: unknown;
  available?: unknown;
}

interface OrderRecord {
  estado?: unknown;
  total?: unknown;
}

type TenantInputResult =
  | {
      valid: true;
      data: SuperAdminTenantInput;
    }
  | {
      valid: false;
      message: string;
    };

const DEFAULT_TENANT_INPUT: SuperAdminTenantInput = {
  tenantId: "",
  name: "",
  category: "",
  featuredCategory: "",
  description: "",
  greeting: "",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  heroImageUrl: "",
  whatsappPhone: "",
  rating: "4.8",
  reviews: "0",
  status: "active",
  orderFlowMode: "simple_whatsapp",
  estimatedPreparationMinutes: 20,
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toStringValue(value: unknown, fallback: string): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function toTenantStatus(value: unknown): SuperAdminTenantStatus {
  return value === "inactive" ? "inactive" : "active";
}

function toOrderFlowMode(value: unknown): SuperAdminOrderFlowMode {
  return value === "dashboard_managed" ? "dashboard_managed" : "simple_whatsapp";
}

function toPreparationMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TENANT_INPUT.estimatedPreparationMinutes;
  }

  return Math.min(180, Math.max(1, Math.round(value)));
}

function toTenantId(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const tenantId = value.trim().toLowerCase();

  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(tenantId) ? tenantId : null;
}

export function generateTenantUrl(tenantId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!isNonEmptyString(baseUrl)) {
    throw new Error("NEXT_PUBLIC_BASE_URL_NOT_CONFIGURED");
  }

  return `${baseUrl.replace(/\/$/, "")}/${tenantId}`;
}

export async function generateTenantQRCode(url: string): Promise<string> {
  return await QRCode.toDataURL(url);
}

function mapTenantRecord(
  tenantId: string,
  record: TenantRecord,
  stats: SuperAdminTenantStats
): SuperAdminTenantSummary {
  const category = toStringValue(record.category, DEFAULT_TENANT_INPUT.category);

  return {
    tenantId,
    name: toStringValue(record.name, "Negocio sin nombre"),
    category,
    featuredCategory: toStringValue(record.featuredCategory, category),
    description: toStringValue(record.description, ""),
    greeting: toStringValue(record.greeting, ""),
    estimatedTime: toStringValue(
      record.estimatedTime,
      DEFAULT_TENANT_INPUT.estimatedTime
    ),
    location: toStringValue(record.location, DEFAULT_TENANT_INPUT.location),
    heroImageUrl: toStringValue(record.heroImageUrl, ""),
    whatsappPhone: toStringValue(record.whatsappPhone, ""),
    rating: toStringValue(record.rating, DEFAULT_TENANT_INPUT.rating),
    reviews: toStringValue(record.reviews, DEFAULT_TENANT_INPUT.reviews),
    status: toTenantStatus(record.status),
    orderFlowMode: toOrderFlowMode(record.orderFlowMode),
    estimatedPreparationMinutes: toPreparationMinutes(
      record.estimatedPreparationMinutes
    ),
    publicUrl: toStringValue(record.publicUrl, ""),
    qrCode: toStringValue(record.qrCode, ""),
    stats,
  };
}

async function getTenantStats(tenantId: string): Promise<SuperAdminTenantStats> {
  const [productsSnapshot, ordersSnapshot] = await Promise.all([
    adminDb.collection("tenants").doc(tenantId).collection("products").get(),
    adminDb.collection("tenants").doc(tenantId).collection("orders").get(),
  ]);

  let activeProductsCount = 0;
  let pendingOrdersCount = 0;
  let totalSales = 0;

  productsSnapshot.forEach((document) => {
    const product = document.data() as ProductRecord;
    const isActive =
      typeof product.available === "boolean"
        ? product.available
        : product.active !== false;

    if (isActive) {
      activeProductsCount += 1;
    }
  });

  ordersSnapshot.forEach((document) => {
    const order = document.data() as OrderRecord;

    if (order.estado === "pendiente" || order.estado === "preparando") {
      pendingOrdersCount += 1;
    }

    if (typeof order.total === "number" && Number.isFinite(order.total)) {
      totalSales += order.total;
    }
  });

  return {
    productsCount: productsSnapshot.size,
    activeProductsCount,
    ordersCount: ordersSnapshot.size,
    pendingOrdersCount,
    totalSales,
  };
}

export function validateSuperAdminTenantInput(
  value: unknown,
  currentTenantId?: string
): TenantInputResult {
  if (!value || typeof value !== "object") {
    return {
      valid: false,
      message: "Datos de tenant inválidos.",
    };
  }

  const record = value as Record<string, unknown>;
  const tenantId = currentTenantId ?? toTenantId(record.tenantId);

  if (!tenantId) {
    return {
      valid: false,
      message:
        "tenantId debe tener 3 a 61 caracteres y usar solo minúsculas, números o guiones.",
    };
  }

  const name = toStringValue(record.name, "");
  const category = toStringValue(record.category, "");
  const featuredCategory = toStringValue(record.featuredCategory, category);
  const estimatedPreparationMinutes = toPreparationMinutes(
    record.estimatedPreparationMinutes
  );

  if (name.length < 3 || name.length > 80) {
    return {
      valid: false,
      message: "El nombre del negocio debe tener entre 3 y 80 caracteres.",
    };
  }

  if (category.length < 3 || category.length > 40) {
    return {
      valid: false,
      message: "La categoría debe tener entre 3 y 40 caracteres.",
    };
  }

  return {
    valid: true,
    data: {
      tenantId,
      name,
      category,
      featuredCategory,
      description: toStringValue(record.description, ""),
      greeting: toStringValue(record.greeting, ""),
      estimatedTime: toStringValue(
        record.estimatedTime,
        DEFAULT_TENANT_INPUT.estimatedTime
      ),
      location: toStringValue(record.location, DEFAULT_TENANT_INPUT.location),
      heroImageUrl: toStringValue(record.heroImageUrl, ""),
      whatsappPhone: toStringValue(record.whatsappPhone, ""),
      rating: toStringValue(record.rating, DEFAULT_TENANT_INPUT.rating),
      reviews: toStringValue(record.reviews, DEFAULT_TENANT_INPUT.reviews),
      status: toTenantStatus(record.status),
      orderFlowMode: toOrderFlowMode(record.orderFlowMode),
      estimatedPreparationMinutes,
    },
  };
}

export async function listSuperAdminTenants(): Promise<
  SuperAdminTenantSummary[]
> {
  const tenantsSnapshot = await adminDb.collection("tenants").orderBy("name").get();
  const tenants = await Promise.all(
    tenantsSnapshot.docs
      .filter((document) => {
        const record = document.data() as TenantRecord;

        return record.active !== false;
      })
      .map(async (document) => {
        const stats = await getTenantStats(document.id);

        return mapTenantRecord(
          document.id,
          document.data() as TenantRecord,
          stats
        );
      })
  );

  return tenants;
}

export async function getSuperAdminTenant(
  tenantId: string
): Promise<SuperAdminTenantSummary | null> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    return null;
  }

  return mapTenantRecord(
    tenantSnapshot.id,
    tenantSnapshot.data() as TenantRecord,
    await getTenantStats(tenantSnapshot.id)
  );
}

export async function createSuperAdminTenant(
  input: SuperAdminTenantInput
): Promise<SuperAdminTenantSummary> {
  const tenantRef = adminDb.collection("tenants").doc(input.tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (tenantSnapshot.exists) {
    throw new Error("TENANT_ALREADY_EXISTS");
  }

  const publicUrl = generateTenantUrl(input.tenantId);
  const qrCode = await generateTenantQRCode(publicUrl);

  await tenantRef.set({
    ...input,
    tenantId: input.tenantId,
    publicUrl,
    qrCode,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const tenant = await getSuperAdminTenant(input.tenantId);

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return tenant;
}

export async function updateSuperAdminTenant(
  tenantId: string,
  input: SuperAdminTenantInput
): Promise<SuperAdminTenantSummary> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }

  await tenantRef.update({
    name: input.name,
    category: input.category,
    featuredCategory: input.featuredCategory,
    description: input.description,
    greeting: input.greeting,
    estimatedTime: input.estimatedTime,
    location: input.location,
    heroImageUrl: input.heroImageUrl,
    whatsappPhone: input.whatsappPhone,
    rating: input.rating,
    reviews: input.reviews,
    status: input.status,
    orderFlowMode: input.orderFlowMode,
    estimatedPreparationMinutes: input.estimatedPreparationMinutes,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const tenant = await getSuperAdminTenant(tenantId);

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return tenant;
}

export async function deleteSuperAdminTenant(tenantId: string): Promise<void> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }

  await tenantRef.update({
    active: false,
    deletedAt: Date.now(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
