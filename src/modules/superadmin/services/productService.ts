import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type {
  SuperAdminProductInput,
  SuperAdminProductOption,
  SuperAdminProductSummary,
} from "../types/superAdmin";
import {
  normalizeProductPricingMode,
  type ProductImage,
  type ProductOptionValue,
} from "@/types/product.types";

interface ProductRecord {
  name?: unknown;
  description?: unknown;
  pricingMode?: unknown;
  price?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  active?: unknown;
  available?: unknown;
  modifiers?: unknown;
  options?: unknown;
  deletedAt?: unknown;
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

const OPTION_TYPES = ["single", "multiple"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toStringValue(value: unknown, fallback = ""): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function isValidOptionType(value: unknown): value is SuperAdminProductOption["type"] {
  return OPTION_TYPES.includes(value as SuperAdminProductOption["type"]);
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

function toPriceDelta(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 100) / 100
    : 0;
}

function normalizeProductOptionValues(value: unknown): ProductOptionValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((optionValue): ProductOptionValue[] => {
    if (!optionValue || typeof optionValue !== "object") {
      return [];
    }

    const record = optionValue as Record<string, unknown>;
    const id = toStringValue(record.id);
    const label = toStringValue(record.label);

    if (!id || !label) {
      return [];
    }

    const priceDelta = toPriceDelta(record.priceDelta);

    return [
      {
        id,
        label,
        ...(priceDelta > 0 ? { priceDelta } : {}),
        active: typeof record.active === "boolean" ? record.active : true,
      },
    ];
  });
}

function normalizeOptions(value: unknown): SuperAdminProductOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option): SuperAdminProductOption[] => {
    if (!option || typeof option !== "object") {
      return [];
    }

    const record = option as Record<string, unknown>;
    const id = toStringValue(record.id);
    const name = toStringValue(record.name);

    if (!id || !name) {
      return [];
    }

    return [
      {
        id,
        name,
        type: isValidOptionType(record.type) ? record.type : "single",
        required: typeof record.required === "boolean" ? record.required : false,
        values: normalizeProductOptionValues(record.values),
      },
    ];
  });
}

function normalizeImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const images = value.flatMap((img): ProductImage[] => {
    if (!img || typeof img !== "object") {
      return [];
    }

    const record = img as Record<string, unknown>;
    const id = toStringValue(record.id);
    const url = toStringValue(record.url);
    const sortOrder = typeof record.sortOrder === "number" ? record.sortOrder : 0;

    if (!id || !url) {
      return [];
    }

    return [
      {
        id,
        url,
        ...(toStringValue(record.alt) ? { alt: toStringValue(record.alt) } : {}),
        ...(toStringValue(record.label)
          ? { label: toStringValue(record.label) }
          : {}),
        sortOrder,
        isPrimary: typeof record.isPrimary === "boolean" ? record.isPrimary : false,
      },
    ];
  });

  const primaryImageId =
    images.find((image) => image.isPrimary)?.id ?? images[0]?.id;

  return images
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image, index) => ({
      ...image,
      sortOrder: index,
      isPrimary: image.id === primaryImageId,
    }));
}

function mapProductRecord(
  productId: string,
  record: ProductRecord
): SuperAdminProductSummary {
  const active = typeof record.active === "boolean" ? record.active : true;
  const pricingMode = normalizeProductPricingMode({
    pricingMode: record.pricingMode,
    price: record.price,
  });
  const price =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? record.price
      : null;

  return {
    productId,
    name: toStringValue(record.name, "Producto sin nombre"),
    description: toStringValue(record.description),
    pricingMode,
    price: pricingMode === "fixed" ? price : null,
    category: toStringValue(record.category),
    imageUrl: toStringValue(record.imageUrl),
    images: normalizeImages(record.images),
    active,
    available: typeof record.available === "boolean" ? record.available : active,
    options: normalizeOptions(record.options),
    createdAt: toTimestampMillis(record.createdAt),
    updatedAt: toTimestampMillis(record.updatedAt),
  };
}

function isDeletedProduct(record: ProductRecord): boolean {
  return record.deletedAt !== null && record.deletedAt !== undefined;
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
  const pricingMode = normalizeProductPricingMode({
    pricingMode: record.pricingMode,
    price: record.price,
  });

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

  const price =
    typeof record.price === "number" && Number.isFinite(record.price)
      ? Math.round(record.price * 100) / 100
      : null;

  if (pricingMode === "fixed" && (price === null || price < 0)) {
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

  const optionsValue = record.options;

  if (optionsValue !== undefined && !Array.isArray(optionsValue)) {
    return {
      valid: false,
      message: "Las opciones deben enviarse como una lista.",
    };
  }

  const options: SuperAdminProductOption[] = [];

  for (const option of Array.isArray(optionsValue) ? optionsValue : []) {
    if (!option || typeof option !== "object") {
      return {
        valid: false,
        message: "Cada opción debe ser un objeto válido.",
      };
    }

    const optionRecord = option as Record<string, unknown>;
    const id = toStringValue(optionRecord.id);
    const optionName = toStringValue(optionRecord.name);

    if (!id) {
      return {
        valid: false,
        message: "Cada opción debe tener id.",
      };
    }

    if (optionName.length < 2 || optionName.length > 60) {
      return {
        valid: false,
        message: "Cada opción debe tener nombre de 2 a 60 caracteres.",
      };
    }

    if (!isValidOptionType(optionRecord.type)) {
      return {
        valid: false,
        message: "Tipo de opción inválido.",
      };
    }

    if (typeof optionRecord.required !== "boolean") {
      return {
        valid: false,
        message: "El campo obligatoria de cada opción es requerido.",
      };
    }

    if (!Array.isArray(optionRecord.values)) {
      return {
        valid: false,
        message: "Cada opción debe tener lista de valores.",
      };
    }

    const values: ProductOptionValue[] = [];

    for (const value of optionRecord.values) {
      if (!value || typeof value !== "object") {
        return {
          valid: false,
          message: "Cada valor de opción debe ser un objeto válido.",
        };
      }

      const valueRecord = value as Record<string, unknown>;
      const valueId = toStringValue(valueRecord.id);
      const label = toStringValue(valueRecord.label);

      if (!valueId) {
        return {
          valid: false,
          message: "Cada valor de opción debe tener id.",
        };
      }

      if (label.length < 1 || label.length > 60) {
        return {
          valid: false,
          message: "Cada valor debe tener etiqueta de 1 a 60 caracteres.",
        };
      }

      if (
        valueRecord.priceDelta !== undefined &&
        (typeof valueRecord.priceDelta !== "number" ||
          !Number.isFinite(valueRecord.priceDelta) ||
          valueRecord.priceDelta < 0)
      ) {
        return {
          valid: false,
          message: "Precio extra de valor inválido.",
        };
      }

      if (typeof valueRecord.active !== "boolean") {
        return {
          valid: false,
          message: "El estado activo de cada valor es requerido.",
        };
      }

      const priceDelta = toPriceDelta(valueRecord.priceDelta);

      values.push({
        id: valueId,
        label,
        ...(priceDelta > 0 ? { priceDelta } : {}),
        active: valueRecord.active,
      });
    }

    options.push({
      id,
      name: optionName,
      type: optionRecord.type,
      required: optionRecord.required,
      values,
    });
  }

  const images = normalizeImages(record.images);
  if (images.length > 5) {
    return {
      valid: false,
      message: "Se permiten máximo 5 imágenes por producto.",
    };
  }

  return {
    valid: true,
    data: {
      name,
      description,
      pricingMode,
      price: pricingMode === "fixed" ? price : null,
      category,
      imageUrl,
      images,
      active: record.active,
      available: record.available,
      options,
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

  return productsSnapshot.docs
    .map((document) => ({
      id: document.id,
      record: document.data() as ProductRecord,
    }))
    .filter(({ record }) => !isDeletedProduct(record))
    .map(({ id, record }) => mapProductRecord(id, record));
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
    pricingMode: input.pricingMode ?? "fixed",
    price: input.pricingMode === "quote" ? null : input.price ?? null,
    category: input.category,
    imageUrl: input.imageUrl,
    images: input.images ?? [],
    active: input.active,
    available: input.active ? input.available : false,
    options: input.options ?? [],
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
    pricingMode: input.pricingMode ?? "fixed",
    price: input.pricingMode === "quote" ? null : input.price ?? null,
    category: input.category,
    imageUrl: input.imageUrl,
    images: input.images ?? [],
    active: input.active,
    available: input.active ? input.available : false,
    options: input.options ?? [],
    updatedAt: FieldValue.serverTimestamp(),
  });

  const product = await getSuperAdminTenantProduct(tenantId, productId);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return product;
}

export async function duplicateSuperAdminTenantProduct(
  tenantId: string,
  productId: string
): Promise<SuperAdminProductSummary> {
  await ensureTenantExists(tenantId);

  const sourceProductRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc(productId);
  const sourceProductSnapshot = await sourceProductRef.get();

  if (!sourceProductSnapshot.exists) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const sourceRecord = sourceProductSnapshot.data() as ProductRecord;

  if (isDeletedProduct(sourceRecord)) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const sourceProduct = mapProductRecord(productId, sourceRecord);
  const productRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .doc();

  await productRef.set({
    name: `${sourceProduct.name} (Copia)`,
    description: sourceProduct.description,
    pricingMode: sourceProduct.pricingMode ?? "fixed",
    price: sourceProduct.price,
    category: sourceProduct.category,
    imageUrl: sourceProduct.imageUrl,
    images: sourceProduct.images ?? [],
    active: sourceProduct.active,
    available: sourceProduct.active ? sourceProduct.available : false,
    options: sourceProduct.options,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const product = await getSuperAdminTenantProduct(tenantId, productRef.id);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return product;
}

export async function setSuperAdminTenantProductActive(
  tenantId: string,
  productId: string,
  active: boolean
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

  const productRecord = productSnapshot.data() as ProductRecord;

  if (isDeletedProduct(productRecord)) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await productRef.update({
    active,
    available: active,
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
    deletedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
