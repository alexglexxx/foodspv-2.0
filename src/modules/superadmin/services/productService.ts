import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type {
  SuperAdminProductInput,
  SuperAdminProductModifier,
  SuperAdminProductPricingMode,
  SuperAdminProductSummary,
} from "../types/superAdmin";

interface ProductRecord {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  active?: unknown;
  available?: unknown;
  modifiers?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

type ProductInputResult =
  | {
      valid: true;
      data: SuperAdminProductInput;
    }
  | {
      valid: false;
      message: string;
    };

const PRICING_MODES: readonly SuperAdminProductPricingMode[] = [
  "included",
  "additive",
  "tier_upgrade",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toStringValue(value: unknown, fallback = ""): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function isValidPricingMode(value: unknown): value is SuperAdminProductPricingMode {
  return PRICING_MODES.includes(value as SuperAdminProductPricingMode);
}

function toTimestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function normalizeModifiers(value: unknown): SuperAdminProductModifier[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((modifier): SuperAdminProductModifier[] => {
    if (!modifier || typeof modifier !== "object") {
      return [];
    }

    const record = modifier as Record<string, unknown>;
    const id = toStringValue(record.id);
    const name = toStringValue(record.name);
    const pricingMode = isValidPricingMode(record.pricingMode)
      ? record.pricingMode
      : "included";
    const priceDelta =
      typeof record.priceDelta === "number" && Number.isFinite(record.priceDelta)
        ? Math.max(0, Math.round(record.priceDelta * 100) / 100)
        : 0;

    if (!id || !name) {
      return [];
    }

    return [
      {
        id,
        name,
        pricingMode,
        priceDelta,
        active: typeof record.active === "boolean" ? record.active : true,
      },
    ];
  });
}

function mapProductRecord(
  productId: string,
  record: ProductRecord
): SuperAdminProductSummary {
  const active = typeof record.active === "boolean" ? record.active : true;

  return {
    productId,
    name: toStringValue(record.name, "Producto sin nombre"),
    description: toStringValue(record.description),
    price:
      typeof record.price === "number" && Number.isFinite(record.price)
        ? record.price
        : 0,
    category: toStringValue(record.category),
    imageUrl: toStringValue(record.imageUrl),
    active,
    available: typeof record.available === "boolean" ? record.available : active,
    modifiers: normalizeModifiers(record.modifiers),
    createdAt: toTimestampMillis(record.createdAt),
    updatedAt: toTimestampMillis(record.updatedAt),
  };
}

async function ensureTenantExists(tenantId: string): Promise<void> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }
}

async function getSuperAdminTenantProduct(
  tenantId: string,
  productId: string
): Promise<SuperAdminProductSummary | null> {
  const productSnapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc(productId)
    .get();

  if (!productSnapshot.exists) {
    return null;
  }

  return mapProductRecord(
    productSnapshot.id,
    productSnapshot.data() as ProductRecord
  );
}

export function validateSuperAdminProductInput(
  value: unknown
): ProductInputResult {
  if (!value || typeof value !== "object") {
    return {
      valid: false,
      message: "Datos de producto inválidos.",
    };
  }

  const record = value as Record<string, unknown>;
  const name = toStringValue(record.name);
  const category = toStringValue(record.category);
  const description = toStringValue(record.description);
  const imageUrl = toStringValue(record.imageUrl);

  if (name.length < 2 || name.length > 80) {
    return {
      valid: false,
      message: "El nombre del producto debe tener entre 2 y 80 caracteres.",
    };
  }

  if (category.length === 0) {
    return {
      valid: false,
      message: "La categoría del producto es requerida.",
    };
  }

  if (typeof record.price !== "number" || !Number.isFinite(record.price) || record.price < 0) {
    return {
      valid: false,
      message: "El precio debe ser un número mayor o igual a 0.",
    };
  }

  if (typeof record.active !== "boolean") {
    return {
      valid: false,
      message: "El estado activo del producto es requerido.",
    };
  }

  if (typeof record.available !== "boolean") {
    return {
      valid: false,
      message: "La disponibilidad del producto es requerida.",
    };
  }

  const modifiersValue = record.modifiers;

  if (modifiersValue !== undefined && !Array.isArray(modifiersValue)) {
    return {
      valid: false,
      message: "Los modificadores deben enviarse como una lista.",
    };
  }

  const modifiers: SuperAdminProductModifier[] = [];

  for (const modifier of Array.isArray(modifiersValue) ? modifiersValue : []) {
    if (!modifier || typeof modifier !== "object") {
      return {
        valid: false,
        message: "Cada modificador debe ser un objeto válido.",
      };
    }

    const modifierRecord = modifier as Record<string, unknown>;
    const id = toStringValue(modifierRecord.id);
    const modifierName = toStringValue(modifierRecord.name);

    if (!id) {
      return {
        valid: false,
        message: "Cada modificador debe tener id.",
      };
    }

    if (modifierName.length < 2 || modifierName.length > 60) {
      return {
        valid: false,
        message: "Cada modificador debe tener nombre de 2 a 60 caracteres.",
      };
    }

    if (!isValidPricingMode(modifierRecord.pricingMode)) {
      return {
        valid: false,
        message: "Tipo de precio de modificador inválido.",
      };
    }

    if (
      typeof modifierRecord.priceDelta !== "number" ||
      !Number.isFinite(modifierRecord.priceDelta) ||
      modifierRecord.priceDelta < 0
    ) {
      return {
        valid: false,
        message: "Precio extra de modificador inválido.",
      };
    }

    if (typeof modifierRecord.active !== "boolean") {
      return {
        valid: false,
        message: "El estado activo del modificador es requerido.",
      };
    }

    modifiers.push({
      id,
      name: modifierName,
      pricingMode: modifierRecord.pricingMode,
      priceDelta: Math.round(modifierRecord.priceDelta * 100) / 100,
      active: modifierRecord.active,
    });
  }

  return {
    valid: true,
    data: {
      name,
      description,
      price: Math.round(record.price * 100) / 100,
      category,
      imageUrl,
      active: record.active,
      available: record.available,
      modifiers,
    },
  };
}

export async function listSuperAdminTenantProducts(
  tenantId: string
): Promise<SuperAdminProductSummary[]> {
  await ensureTenantExists(tenantId);

  const productsSnapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .orderBy("name")
    .get();

  return productsSnapshot.docs.map((document) =>
    mapProductRecord(document.id, document.data() as ProductRecord)
  );
}

export async function createSuperAdminTenantProduct(
  tenantId: string,
  input: SuperAdminProductInput
): Promise<SuperAdminProductSummary> {
  await ensureTenantExists(tenantId);

  const productRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc();

  await productRef.set({
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    imageUrl: input.imageUrl,
    active: input.active,
    available: input.active ? input.available : false,
    modifiers: input.modifiers ?? [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const product = await getSuperAdminTenantProduct(tenantId, productRef.id);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return product;
}

export async function updateSuperAdminTenantProduct(
  tenantId: string,
  productId: string,
  input: SuperAdminProductInput
): Promise<SuperAdminProductSummary> {
  await ensureTenantExists(tenantId);

  const productRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc(productId);
  const productSnapshot = await productRef.get();

  if (!productSnapshot.exists) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await productRef.update({
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    imageUrl: input.imageUrl,
    active: input.active,
    available: input.active ? input.available : false,
    modifiers: input.modifiers ?? [],
    updatedAt: FieldValue.serverTimestamp(),
  });

  const product = await getSuperAdminTenantProduct(tenantId, productId);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return product;
}

export async function deleteSuperAdminTenantProduct(
  tenantId: string,
  productId: string
): Promise<void> {
  await ensureTenantExists(tenantId);

  const productRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc(productId);
  const productSnapshot = await productRef.get();

  if (!productSnapshot.exists) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await productRef.update({
    active: false,
    available: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
