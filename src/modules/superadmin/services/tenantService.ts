import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import QRCode from "qrcode";

import { adminDb } from "@/lib/firebase-admin";
import {
  DESIGN_PRESETS_BY_CATEGORY,
  normalizeTenantCategory,
} from "@/modules/design/tenantDesignPresets";
import {
  getVisualPreset,
  isValidVisualPresetId,
} from "@/modules/design/tenantVisualPresets";
import type { TenantUpdateInput } from "@/modules/tenants/tenantUpdateValidator";
import type {
  SuperAdminDeliveryConfig,
  SuperAdminOrderConfirmationAction,
  SuperAdminOrderConfirmationPolicy,
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
  visualPresetId?: unknown;
  designPresetId?: unknown;
  description?: unknown;
  greeting?: unknown;
  estimatedTime?: unknown;
  location?: unknown;
  heroImageUrl?: unknown;
  whatsappPhone?: unknown;
  metaPhoneNumberId?: unknown;
  metaAccessToken?: unknown;
  rating?: unknown;
  reviews?: unknown;
  status?: unknown;
  orderFlowMode?: unknown;
  estimatedPreparationMinutes?: unknown;
  orderConfirmationPolicy?: unknown;
  deliveryConfig?: unknown;
  deliveryEnabled?: unknown;
  deliveryFee?: unknown;
  deliveryMinimumOrder?: unknown;
  deliveryNotes?: unknown;
  publicUrl?: unknown;
  qrCode?: unknown;
}

interface ProductRecord {
  active?: unknown;
  available?: unknown;
  deletedAt?: unknown;
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
  category: "generico",
  featuredCategory: "Generico",
  visualPresetId: "fresh",
  description: "",
  greeting: "",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  heroImageUrl: "",
  active: true,
  whatsappPhone: "",
  metaPhoneNumberId: "",
  metaAccessToken: "",
  rating: "4.8",
  reviews: "0",
  status: "active",
  orderFlowMode: "simple_whatsapp",
  estimatedPreparationMinutes: 20,
  orderConfirmationPolicy: {
    enabled: false,
    amountThreshold: 1,
    action: "allow",
  },
  deliveryConfig: {
    enabled: false,
  },
  deliveryEnabled: false,
  deliveryFee: 0,
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

function toActive(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_TENANT_INPUT.active;
}

function hasDeletedAt(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function toDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function toPreparationMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TENANT_INPUT.estimatedPreparationMinutes;
  }

  return Math.min(180, Math.max(1, Math.round(value)));
}

function toDeliveryFee(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_TENANT_INPUT.deliveryFee;
  }

  return Math.round(value * 100) / 100;
}

function toOptionalDeliveryAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
}

function normalizeDeliveryConfig(
  value: unknown,
  fallback: {
    enabled?: unknown;
    fee?: unknown;
    minimumOrder?: unknown;
    notes?: unknown;
  } = {}
): SuperAdminDeliveryConfig {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as {
          enabled?: unknown;
          fee?: unknown;
          minimumOrder?: unknown;
          notes?: unknown;
        })
      : null;
  const enabled =
    typeof record?.enabled === "boolean"
      ? record.enabled
      : fallback.enabled === true;
  const fee = toOptionalDeliveryAmount(record?.fee ?? fallback.fee);
  const minimumOrder = toOptionalDeliveryAmount(
    record?.minimumOrder ?? fallback.minimumOrder
  );
  const notes = toStringValue(record?.notes ?? fallback.notes, "");

  return {
    enabled,
    ...(enabled ? { fee: fee ?? 0 } : { fee: 0 }),
    ...(minimumOrder !== undefined ? { minimumOrder } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}

function isOrderConfirmationAction(
  value: unknown
): value is SuperAdminOrderConfirmationAction {
  return value === "allow" || value === "require_manual_confirmation";
}

function normalizeOrderConfirmationPolicy(
  value: unknown
): SuperAdminOrderConfirmationPolicy | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as {
    enabled?: unknown;
    amountThreshold?: unknown;
    action?: unknown;
  };

  if (typeof record.enabled !== "boolean") {
    return null;
  }

  if (
    typeof record.amountThreshold !== "number" ||
    !Number.isFinite(record.amountThreshold) ||
    record.amountThreshold < 1
  ) {
    return null;
  }

  const action = record.enabled ? "require_manual_confirmation" : "allow";

  if (isOrderConfirmationAction(record.action) && record.action !== action) {
    return null;
  }

  return {
    enabled: record.enabled,
    amountThreshold: Math.round(record.amountThreshold * 100) / 100,
    action,
  };
}

function getOrderConfirmationPolicy(
  value: unknown
): SuperAdminOrderConfirmationPolicy {
  return (
    normalizeOrderConfirmationPolicy(value) ??
    DEFAULT_TENANT_INPUT.orderConfirmationPolicy
  );
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
  const category = normalizeTenantCategory(record.category);
  const visualPreset = getVisualPreset(
    isValidVisualPresetId(record.visualPresetId)
      ? record.visualPresetId
      : undefined
  );
  const deliveryConfig = normalizeDeliveryConfig(record.deliveryConfig, {
    enabled: record.deliveryEnabled,
    fee: record.deliveryFee,
    minimumOrder: record.deliveryMinimumOrder,
    notes: record.deliveryNotes,
  });

  return {
    tenantId,
    name: toStringValue(record.name, "Negocio sin nombre"),
    category,
    featuredCategory: toStringValue(record.featuredCategory, category),
    visualPresetId: visualPreset.id,
    description: toStringValue(record.description, ""),
    greeting: toStringValue(record.greeting, ""),
    estimatedTime: toStringValue(
      record.estimatedTime,
      DEFAULT_TENANT_INPUT.estimatedTime
    ),
    location: toStringValue(record.location, DEFAULT_TENANT_INPUT.location),
    heroImageUrl: toStringValue(record.heroImageUrl, ""),
    active: toActive(record.active),
    whatsappPhone: toStringValue(record.whatsappPhone, ""),
    metaPhoneNumberId: toStringValue(record.metaPhoneNumberId, ""),
    metaAccessToken: toStringValue(record.metaAccessToken, ""),
    rating: toStringValue(record.rating, DEFAULT_TENANT_INPUT.rating),
    reviews: toStringValue(record.reviews, DEFAULT_TENANT_INPUT.reviews),
    status: toTenantStatus(record.status),
    orderFlowMode: toOrderFlowMode(record.orderFlowMode),
    estimatedPreparationMinutes: toPreparationMinutes(
      record.estimatedPreparationMinutes
    ),
    orderConfirmationPolicy: getOrderConfirmationPolicy(
      record.orderConfirmationPolicy
    ),
    deliveryConfig,
    deliveryEnabled: deliveryConfig.enabled,
    deliveryFee: deliveryConfig.enabled ? deliveryConfig.fee ?? 0 : 0,
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

  let productsCount = 0;
  let activeProductsCount = 0;
  let pendingOrdersCount = 0;
  let totalSales = 0;

  productsSnapshot.forEach((document) => {
    const product = document.data() as ProductRecord;
    const isDeleted = product.deletedAt !== null && product.deletedAt !== undefined;
    const isListed = !isDeleted && product.active !== false;
    const isActive =
      isListed &&
      (typeof product.available === "boolean" ? product.available : true);

    if (isListed) {
      productsCount += 1;
    }

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
    productsCount,
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
  const category = normalizeTenantCategory(record.category);
  const featuredCategory = toStringValue(record.featuredCategory, category);
  const visualPresetId = record.visualPresetId ?? "fresh";
  const estimatedPreparationMinutes = toPreparationMinutes(
    record.estimatedPreparationMinutes
  );
  const orderFlowMode = toOrderFlowMode(record.orderFlowMode);
  const active = toActive(record.active);
  const whatsappPhone = toDigits(toStringValue(record.whatsappPhone, ""));
  const metaPhoneNumberId = toStringValue(record.metaPhoneNumberId, "");
  const metaAccessToken = toStringValue(record.metaAccessToken, "");
  const orderConfirmationPolicy = normalizeOrderConfirmationPolicy(
    record.orderConfirmationPolicy
  );
  const deliveryEnabled = record.deliveryEnabled === true;
  const deliveryFee = toDeliveryFee(record.deliveryFee);
  const deliveryConfig = normalizeDeliveryConfig(record.deliveryConfig, {
    enabled: deliveryEnabled,
    fee: deliveryFee,
    minimumOrder: record.deliveryMinimumOrder,
    notes: record.deliveryNotes,
  });
  if (name.length < 3 || name.length > 80) {
    return {
      valid: false,
      message: "El nombre del negocio debe tener entre 3 y 80 caracteres.",
    };
  }

  if (!DESIGN_PRESETS_BY_CATEGORY[category]) {
    return {
      valid: false,
      message: "Selecciona una categoría válida.",
    };
  }

  if (!isValidVisualPresetId(visualPresetId)) {
    return {
      valid: false,
      message: "Selecciona un preset visual válido.",
    };
  }

  if (!orderConfirmationPolicy) {
    return {
      valid: false,
      message:
        "Configura la protección de pedidos grandes con un monto desde válido mayor o igual a 1.",
    };
  }

  if (whatsappPhone.length < 12) {
    return {
      valid: false,
      message: "WhatsApp Business Phone debe tener al menos 12 dígitos.",
    };
  }

  if (metaPhoneNumberId.length < 10) {
    return {
      valid: false,
      message: "Meta Phone Number ID debe tener al menos 10 caracteres.",
    };
  }

  if (metaAccessToken.length < 20) {
    return {
      valid: false,
      message: "Meta Access Token debe tener al menos 20 caracteres.",
    };
  }

  return {
    valid: true,
    data: {
      tenantId,
      name,
      category,
      featuredCategory,
      visualPresetId,
      description: toStringValue(record.description, ""),
      greeting: toStringValue(record.greeting, ""),
      estimatedTime: toStringValue(
        record.estimatedTime,
        DEFAULT_TENANT_INPUT.estimatedTime
      ),
      location: toStringValue(record.location, DEFAULT_TENANT_INPUT.location),
      heroImageUrl: toStringValue(record.heroImageUrl, ""),
      active,
      whatsappPhone,
      metaPhoneNumberId,
      metaAccessToken,
      rating: toStringValue(record.rating, DEFAULT_TENANT_INPUT.rating),
      reviews: toStringValue(record.reviews, DEFAULT_TENANT_INPUT.reviews),
      status: toTenantStatus(record.status),
      orderFlowMode,
      estimatedPreparationMinutes,
      orderConfirmationPolicy,
      deliveryConfig,
      deliveryEnabled: deliveryConfig.enabled,
      deliveryFee: deliveryConfig.enabled ? deliveryConfig.fee ?? 0 : 0,
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

        return !hasDeletedAt(record.deletedAt);
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
    active: input.active,
    whatsappPhone: input.whatsappPhone,
    metaPhoneNumberId: input.metaPhoneNumberId,
    metaAccessToken: input.metaAccessToken,
    rating: input.rating,
    reviews: input.reviews,
    status: input.status,
    orderFlowMode: input.orderFlowMode,
    estimatedPreparationMinutes: input.estimatedPreparationMinutes,
    orderConfirmationPolicy: input.orderConfirmationPolicy,
    deliveryConfig: input.deliveryConfig,
    deliveryEnabled: input.deliveryConfig.enabled,
    deliveryFee: input.deliveryConfig.enabled ? input.deliveryConfig.fee ?? 0 : 0,
    visualPresetId: input.visualPresetId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const tenant = await getSuperAdminTenant(tenantId);

  if (!tenant) {
    throw new Error("TENANT_NOT_FOUND");
  }

  return tenant;
}

export async function updateSuperAdminTenantPartial(
  tenantId: string,
  input: TenantUpdateInput
): Promise<SuperAdminTenantSummary> {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnapshot = await tenantRef.get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.category !== undefined) updatePayload.category = input.category;
  if (input.featuredCategory !== undefined) {
    updatePayload.featuredCategory = input.featuredCategory;
  }
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.greeting !== undefined) updatePayload.greeting = input.greeting;
  if (input.rating !== undefined) updatePayload.rating = input.rating;
  if (input.reviews !== undefined) updatePayload.reviews = input.reviews;
  if (input.estimatedTime !== undefined) {
    updatePayload.estimatedTime = input.estimatedTime;
  }
  if (input.location !== undefined) updatePayload.location = input.location;
  if (input.heroImageUrl !== undefined) {
    updatePayload.heroImageUrl = input.heroImageUrl;
  }
  if (input.whatsappPhone !== undefined) {
    updatePayload.whatsappPhone = input.whatsappPhone;
  }
  if (input.metaPhoneNumberId !== undefined) {
    updatePayload.metaPhoneNumberId = input.metaPhoneNumberId;
  }
  if (input.metaAccessToken !== undefined) {
    updatePayload.metaAccessToken = input.metaAccessToken;
  }
  if (input.active !== undefined) updatePayload.active = input.active;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.orderFlowMode !== undefined) {
    updatePayload.orderFlowMode = input.orderFlowMode;
  }
  if (input.estimatedPreparationMinutes !== undefined) {
    updatePayload.estimatedPreparationMinutes =
      input.estimatedPreparationMinutes;
  }
  if (input.orderConfirmationPolicy !== undefined) {
    updatePayload.orderConfirmationPolicy = input.orderConfirmationPolicy;
  }
  if (input.visualPresetId !== undefined) {
    updatePayload.visualPresetId = input.visualPresetId;
  }
  if (input.deliveryConfig !== undefined) {
    updatePayload.deliveryConfig = input.deliveryConfig;
    updatePayload.deliveryEnabled = input.deliveryConfig.enabled;
    updatePayload.deliveryFee = input.deliveryConfig.enabled
      ? input.deliveryConfig.fee ?? 0
      : 0;
  } else {
    if (input.deliveryEnabled !== undefined) {
      updatePayload.deliveryEnabled = input.deliveryEnabled;
    }
    if (input.deliveryFee !== undefined) {
      updatePayload.deliveryFee = input.deliveryFee;
    }
  }

  await tenantRef.update(updatePayload);

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
