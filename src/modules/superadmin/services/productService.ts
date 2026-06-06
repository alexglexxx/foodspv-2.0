import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type {
  SuperAdminProductInput,
  SuperAdminProductOption,
  SuperAdminProductSummary,
} from "../types/superAdmin";
import type { ProductOptionValue } from "@/types/product.types";

interface ProductRecord {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  active?: unknown;
  available?: unknown;
  modifiers?: unknown;
  options?: unknown;
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
    options: normalizeOptions(record.options),
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
    price: input.price,
    category: input.category,
    imageUrl: input.imageUrl,
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
