import {
  getDefaultPresetForCategory,
  isValidPresetForCategory,
  normalizeTenantCategory,
  type TenantCategory,
} from "@/modules/design/tenantDesignPresets";
import type { OrderFlowMode } from "@/types/tenant.types";

export interface TenantDeliveryConfig {
  enabled: boolean;
  fee?: number;
  minimumOrder?: number;
  notes?: string;
}

export interface TenantEditableState {
  category?: unknown;
  designPresetId?: unknown;
  deliveryConfig?: unknown;
  deliveryEnabled?: unknown;
  deliveryFee?: unknown;
}

export interface TenantUpdateInput {
  name?: string;
  category?: TenantCategory;
  featuredCategory?: string;
  description?: string;
  greeting?: string;
  estimatedTime?: string;
  location?: string;
  heroImageUrl?: string;
  whatsappPhone?: string;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  active?: boolean;
  status?: "active" | "inactive";
  orderFlowMode?: OrderFlowMode;
  estimatedPreparationMinutes?: number;
  designPresetId?: string;
  deliveryConfig?: TenantDeliveryConfig;
  deliveryEnabled?: boolean;
  deliveryFee?: number;
}

export type TenantUpdateValidationResult =
  | {
      valid: true;
      data: TenantUpdateInput;
    }
  | {
      valid: false;
      message: string;
    };

const DANGEROUS_FIELDS = new Set([
  "createdAt",
  "deletedAt",
  "stats",
  "id",
  "_id",
  "tenantId",
  "publicUrl",
  "qrCode",
  "tenantTheme",
]);

const ALLOWED_FIELDS = new Set([
  "name",
  "category",
  "featuredCategory",
  "description",
  "greeting",
  "estimatedTime",
  "location",
  "heroImageUrl",
  "whatsappPhone",
  "metaPhoneNumberId",
  "metaAccessToken",
  "active",
  "status",
  "orderFlowMode",
  "estimatedPreparationMinutes",
  "designPresetId",
  "deliveryConfig",
  "deliveryEnabled",
  "deliveryFee",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(
  value: unknown,
  fieldLabel: string,
  options: {
    min?: number;
    max: number;
    optionalEmpty?: boolean;
  }
): { valid: true; value: string } | { valid: false; message: string } {
  if (typeof value !== "string") {
    return {
      valid: false,
      message: `${fieldLabel} debe ser texto.`,
    };
  }

  const normalizedValue = value.trim();
  const min = options.min ?? 0;

  if (!options.optionalEmpty && normalizedValue.length < min) {
    return {
      valid: false,
      message: `${fieldLabel} debe tener al menos ${min} caracteres.`,
    };
  }

  if (
    options.optionalEmpty &&
    normalizedValue.length > 0 &&
    normalizedValue.length < min
  ) {
    return {
      valid: false,
      message: `${fieldLabel} debe tener al menos ${min} caracteres si se captura.`,
    };
  }

  if (normalizedValue.length > options.max) {
    return {
      valid: false,
      message: `${fieldLabel} debe tener máximo ${options.max} caracteres.`,
    };
  }

  return {
    valid: true,
    value: normalizedValue,
  };
}

function normalizeOptionalUrl(
  value: unknown
): { valid: true; value: string } | { valid: false; message: string } {
  const stringResult = normalizeString(value, "Hero URL", {
    max: 500,
    optionalEmpty: true,
  });

  if (!stringResult.valid) {
    return stringResult;
  }

  if (stringResult.value.length === 0) {
    return stringResult;
  }

  try {
    const url = new URL(stringResult.value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        valid: false,
        message: "Hero URL debe usar http o https.",
      };
    }
  } catch {
    return {
      valid: false,
      message: "Hero URL debe ser una URL válida.",
    };
  }

  return stringResult;
}

function normalizeOptionalPhone(
  value: unknown
): { valid: true; value: string } | { valid: false; message: string } {
  const stringResult = normalizeString(value, "WhatsApp", {
    max: 24,
    optionalEmpty: true,
  });

  if (!stringResult.valid) {
    return stringResult;
  }

  const digits = stringResult.value.replace(/\D/g, "");

  if (digits.length > 0 && (digits.length < 10 || digits.length > 16)) {
    return {
      valid: false,
      message: "WhatsApp debe tener entre 10 y 16 dígitos.",
    };
  }

  return {
    valid: true,
    value: digits,
  };
}

function normalizeNumber(
  value: unknown,
  fieldLabel: string,
  options: {
    min: number;
    max: number;
    integer?: boolean;
  }
): { valid: true; value: number } | { valid: false; message: string } {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      valid: false,
      message: `${fieldLabel} debe ser un número válido.`,
    };
  }

  const normalizedValue = options.integer
    ? Math.round(value)
    : Math.round(value * 100) / 100;

  if (normalizedValue < options.min || normalizedValue > options.max) {
    return {
      valid: false,
      message: `${fieldLabel} debe estar entre ${options.min} y ${options.max}.`,
    };
  }

  return {
    valid: true,
    value: normalizedValue,
  };
}

function normalizeDeliveryConfig(
  value: unknown
): { valid: true; value: TenantDeliveryConfig } | { valid: false; message: string } {
  if (!isRecord(value)) {
    return {
      valid: false,
      message: "Configuración de entrega inválida.",
    };
  }

  if (typeof value.enabled !== "boolean") {
    return {
      valid: false,
      message: "Entrega a domicilio requiere enabled booleano.",
    };
  }

  const deliveryConfig: TenantDeliveryConfig = {
    enabled: value.enabled,
  };

  if (value.fee !== undefined) {
    const fee = normalizeNumber(value.fee, "Costo de envío", {
      min: 0,
      max: 2000,
    });

    if (!fee.valid) {
      return fee;
    }

    deliveryConfig.fee = value.enabled ? fee.value : 0;
  } else if (value.enabled) {
    deliveryConfig.fee = 0;
  }

  if (value.minimumOrder !== undefined) {
    const minimumOrder = normalizeNumber(value.minimumOrder, "Pedido mínimo", {
      min: 0,
      max: 100000,
    });

    if (!minimumOrder.valid) {
      return minimumOrder;
    }

    deliveryConfig.minimumOrder = minimumOrder.value;
  }

  if (value.notes !== undefined) {
    const notes = normalizeString(value.notes, "Notas de entrega", {
      max: 240,
      optionalEmpty: true,
    });

    if (!notes.valid) {
      return notes;
    }

    deliveryConfig.notes = notes.value;
  }

  return {
    valid: true,
    value: deliveryConfig,
  };
}

function hasDangerousField(record: Record<string, unknown>): string | null {
  return Object.keys(record).find((key) => DANGEROUS_FIELDS.has(key)) ?? null;
}

function hasUnknownField(record: Record<string, unknown>): string | null {
  return Object.keys(record).find((key) => !ALLOWED_FIELDS.has(key)) ?? null;
}

function getCurrentCategory(currentTenant: TenantEditableState): TenantCategory {
  return normalizeTenantCategory(currentTenant.category);
}

function getCurrentDesignPresetId(
  currentTenant: TenantEditableState,
  category: TenantCategory
): string {
  return typeof currentTenant.designPresetId === "string" &&
    isValidPresetForCategory(category, currentTenant.designPresetId)
    ? currentTenant.designPresetId
    : getDefaultPresetForCategory(category).id;
}

export function validateTenantUpdateInput(
  value: unknown,
  currentTenant: TenantEditableState
): TenantUpdateValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      message: "Datos de tenant inválidos.",
    };
  }

  const dangerousField = hasDangerousField(value);

  if (dangerousField) {
    return {
      valid: false,
      message: `No se permite modificar ${dangerousField}.`,
    };
  }

  const unknownField = hasUnknownField(value);

  if (unknownField) {
    return {
      valid: false,
      message: `Campo no permitido: ${unknownField}.`,
    };
  }

  const updates: TenantUpdateInput = {};
  const currentCategory = getCurrentCategory(currentTenant);
  const nextCategory =
    value.category !== undefined
      ? normalizeTenantCategory(value.category)
      : currentCategory;

  if (value.name !== undefined) {
    const result = normalizeString(value.name, "Nombre", {
      min: 3,
      max: 80,
    });

    if (!result.valid) {
      return result;
    }

    updates.name = result.value;
  }

  if (value.category !== undefined) {
    updates.category = nextCategory;
  }

  if (value.featuredCategory !== undefined) {
    const result = normalizeString(value.featuredCategory, "Categoría destacada", {
      min: 2,
      max: 60,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.featuredCategory = result.value || nextCategory;
  }

  if (value.description !== undefined) {
    const result = normalizeString(value.description, "Descripción", {
      max: 300,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.description = result.value;
  }

  if (value.greeting !== undefined) {
    const result = normalizeString(value.greeting, "Saludo", {
      max: 120,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.greeting = result.value;
  }

  if (value.estimatedTime !== undefined) {
    const result = normalizeString(value.estimatedTime, "Tiempo estimado", {
      max: 40,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.estimatedTime = result.value;
  }

  if (value.location !== undefined) {
    const result = normalizeString(value.location, "Ubicación", {
      max: 120,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.location = result.value;
  }

  if (value.heroImageUrl !== undefined) {
    const result = normalizeOptionalUrl(value.heroImageUrl);

    if (!result.valid) {
      return result;
    }

    updates.heroImageUrl = result.value;
  }

  if (value.whatsappPhone !== undefined) {
    const result = normalizeOptionalPhone(value.whatsappPhone);

    if (!result.valid) {
      return result;
    }

    updates.whatsappPhone = result.value;
  }

  if (value.metaPhoneNumberId !== undefined) {
    const result = normalizeString(value.metaPhoneNumberId, "Meta Phone Number ID", {
      max: 80,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.metaPhoneNumberId = result.value;
  }

  if (value.metaAccessToken !== undefined) {
    const result = normalizeString(value.metaAccessToken, "Meta Access Token", {
      max: 500,
      optionalEmpty: true,
    });

    if (!result.valid) {
      return result;
    }

    updates.metaAccessToken = result.value;
  }

  if (value.active !== undefined) {
    if (typeof value.active !== "boolean") {
      return {
        valid: false,
        message: "active debe ser booleano.",
      };
    }

    updates.active = value.active;
  }

  if (value.status !== undefined) {
    if (value.status !== "active" && value.status !== "inactive") {
      return {
        valid: false,
        message: "Estado inválido.",
      };
    }

    updates.status = value.status;
  }

  if (value.orderFlowMode !== undefined) {
    if (
      value.orderFlowMode !== "simple_whatsapp" &&
      value.orderFlowMode !== "dashboard_managed"
    ) {
      return {
        valid: false,
        message: "Modo de pedidos inválido.",
      };
    }

    updates.orderFlowMode = value.orderFlowMode;
  }

  if (value.estimatedPreparationMinutes !== undefined) {
    const result = normalizeNumber(
      value.estimatedPreparationMinutes,
      "Minutos de preparación",
      {
        min: 1,
        max: 180,
        integer: true,
      }
    );

    if (!result.valid) {
      return result;
    }

    updates.estimatedPreparationMinutes = result.value;
  }

  if (value.designPresetId !== undefined) {
    const result = normalizeString(value.designPresetId, "Preset de diseño", {
      min: 2,
      max: 80,
    });

    if (!result.valid) {
      return result;
    }

    if (!isValidPresetForCategory(nextCategory, result.value)) {
      return {
        valid: false,
        message: "El preset de diseño no existe para esa categoría.",
      };
    }

    updates.designPresetId = result.value;
  } else if (value.category !== undefined) {
    const currentPresetId = getCurrentDesignPresetId(currentTenant, nextCategory);
    updates.designPresetId = currentPresetId;
  }

  if (value.deliveryConfig !== undefined) {
    const result = normalizeDeliveryConfig(value.deliveryConfig);

    if (!result.valid) {
      return result;
    }

    updates.deliveryConfig = result.value;
    updates.deliveryEnabled = result.value.enabled;
    updates.deliveryFee = result.value.enabled ? result.value.fee ?? 0 : 0;
  }

  if (value.deliveryEnabled !== undefined) {
    if (typeof value.deliveryEnabled !== "boolean") {
      return {
        valid: false,
        message: "deliveryEnabled debe ser booleano.",
      };
    }

    updates.deliveryEnabled = value.deliveryEnabled;
    updates.deliveryConfig = {
      enabled: value.deliveryEnabled,
      fee: value.deliveryEnabled ? updates.deliveryFee ?? 0 : 0,
    };
  }

  if (value.deliveryFee !== undefined) {
    const result = normalizeNumber(value.deliveryFee, "Costo de envío", {
      min: 0,
      max: 2000,
    });

    if (!result.valid) {
      return result;
    }

    updates.deliveryFee = result.value;
    updates.deliveryConfig = {
      enabled: updates.deliveryEnabled ?? true,
      fee: result.value,
    };
  }

  return {
    valid: true,
    data: updates,
  };
}
