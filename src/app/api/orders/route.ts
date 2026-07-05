import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { upsertCustomerProfile } from "@/modules/customers/server/upsertCustomerProfile";
import { customerConfirmationAgent } from "@/modules/orders/agents/customerConfirmationAgent";
import {
  firestoreWriterAgent,
  updateFirestoreOrderWhatsAppAgent,
} from "@/modules/orders/agents/firestoreWriterAgent";
import { orderValidatorAgent } from "@/modules/orders/agents/orderValidatorAgent";
import { tenantOrderFlowConfigAgent } from "@/modules/orders/agents/tenantOrderFlowConfigAgent";
import { whatsappComandaAgent } from "@/modules/orders/agents/whatsappComandaAgent";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";
import { isTenantAvailable } from "@/modules/tenants/tenantAvailability";
import type {
  Order,
  OrderItem,
  OrderWhatsAppState,
} from "@/modules/orders/types/order";
import type {
  ProductOption,
  ProductOptionValue,
  ProductPricingMode,
  SelectedProductOption,
} from "@/types/product.types";
import {
  buildOrderPricingSummary,
} from "@/modules/orders/utils/pricing";
import { normalizeProductPricingMode } from "@/types/product.types";

interface OrderConfirmationPolicyRecord {
  enabled?: unknown;
  amountThreshold?: unknown;
  action?: unknown;
}

interface TenantOrderConfirmationPolicyRecord {
  active?: unknown;
  deletedAt?: unknown;
  orderConfirmationPolicy?: unknown;
  slug?: unknown;
  status?: unknown;
}

interface OrderConfirmationPolicy {
  enabled: boolean;
  amountThreshold: number;
  action: "allow" | "require_manual_confirmation";
}

interface TenantOrderContext {
  confirmationPolicy: OrderConfirmationPolicy;
  tenantSlug: string;
}

interface CatalogProductRecord {
  name?: unknown;
  pricingMode?: unknown;
  price?: unknown;
  active?: unknown;
  available?: unknown;
  options?: unknown;
  deletedAt?: unknown;
}

interface CatalogProduct {
  id: string;
  name: string;
  pricingMode: ProductPricingMode;
  price?: number | null;
  active: boolean;
  available: boolean;
  options: ProductOption[];
}

type CatalogValidationResult =
  | {
      valid: true;
      order: Order;
    }
  | {
      valid: false;
      errors: string[];
    };

const DEFAULT_ORDER_CONFIRMATION_POLICY: OrderConfirmationPolicy = {
  enabled: false,
  amountThreshold: 1,
  action: "allow",
};

function normalizeOrderConfirmationPolicy(
  value: unknown
): OrderConfirmationPolicy {
  if (!value || typeof value !== "object") {
    return DEFAULT_ORDER_CONFIRMATION_POLICY;
  }

  const record = value as OrderConfirmationPolicyRecord;
  const enabled = record.enabled === true;
  const amountThreshold =
    typeof record.amountThreshold === "number" &&
    Number.isFinite(record.amountThreshold) &&
    record.amountThreshold >= 1
      ? record.amountThreshold
      : DEFAULT_ORDER_CONFIRMATION_POLICY.amountThreshold;

  return {
    enabled,
    amountThreshold,
    action: enabled ? "require_manual_confirmation" : "allow",
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

    if (!isNonEmptyString(record.id) || !isNonEmptyString(record.label)) {
      return [];
    }

    const priceDelta = toPriceDelta(record.priceDelta);

    return [
      {
        id: record.id.trim(),
        label: record.label.trim(),
        ...(priceDelta > 0 ? { priceDelta } : {}),
        active: typeof record.active === "boolean" ? record.active : true,
      },
    ];
  });
}

function normalizeProductOptions(value: unknown): ProductOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option): ProductOption[] => {
    if (!option || typeof option !== "object") {
      return [];
    }

    const record = option as Record<string, unknown>;

    if (!isNonEmptyString(record.id) || !isNonEmptyString(record.name)) {
      return [];
    }

    return [
      {
        id: record.id.trim(),
        name: record.name.trim(),
        type: record.type === "multiple" ? "multiple" : "single",
        required: typeof record.required === "boolean" ? record.required : false,
        values: normalizeProductOptionValues(record.values),
      },
    ];
  });
}

function mapCatalogProduct(
  id: string,
  record: CatalogProductRecord | undefined
): CatalogProduct | null {
  if (!record || !isNonEmptyString(record.name)) {
    return null;
  }

  if (record.deletedAt !== null && record.deletedAt !== undefined) {
    return null;
  }

  const active = typeof record.active === "boolean" ? record.active : true;
  const pricingMode = normalizeProductPricingMode({
    pricingMode: record.pricingMode,
    price: record.price,
  });

  if (
    pricingMode === "fixed" &&
    (typeof record.price !== "number" || !Number.isFinite(record.price))
  ) {
    return null;
  }

  return {
    id,
    name: record.name.trim(),
    pricingMode,
    price:
      pricingMode === "fixed" && typeof record.price === "number"
        ? Math.round(record.price * 100) / 100
        : null,
    active,
    available: typeof record.available === "boolean" ? record.available : active,
    options: normalizeProductOptions(record.options),
  };
}

function getActiveOptions(product: CatalogProduct): ProductOption[] {
  return product.options
    .map((option) => ({
      ...option,
      values: option.values.filter((value) => value.active),
    }))
    .filter((option) => option.values.length > 0);
}

function validateSelectedOptions(
  item: OrderItem,
  product: CatalogProduct,
  itemIndex: number
): { selectedOptions: SelectedProductOption[]; priceDeltaTotal: number; errors: string[] } {
  const errors: string[] = [];
  const activeOptions = getActiveOptions(product);
  const optionMap = new Map(activeOptions.map((option) => [option.id, option]));
  const selectedOptionsInput = item.selectedOptions ?? [];
  const selectedOptionIds = new Set<string>();
  const selectedOptions: SelectedProductOption[] = [];
  let priceDeltaTotal = 0;

  for (const selectedOption of selectedOptionsInput) {
    const option = optionMap.get(selectedOption.optionId);

    if (!option) {
      errors.push(
        `Producto ${itemIndex + 1}: opción ${selectedOption.optionId} inválida.`
      );
      continue;
    }

    if (selectedOptionIds.has(option.id)) {
      errors.push(`Producto ${itemIndex + 1}: opción duplicada ${option.name}.`);
      continue;
    }

    selectedOptionIds.add(option.id);

    const valueIds = [...new Set(selectedOption.valueIds.map((valueId) => valueId.trim()))];

    if (option.type === "single" && valueIds.length !== 1) {
      errors.push(`Producto ${itemIndex + 1}: ${option.name} requiere una selección.`);
      continue;
    }

    if (option.type === "multiple" && valueIds.length === 0) {
      errors.push(`Producto ${itemIndex + 1}: ${option.name} no tiene valores.`);
      continue;
    }

    const valueMap = new Map(option.values.map((value) => [value.id, value]));
    const values: ProductOptionValue[] = [];

    for (const valueId of valueIds) {
      const value = valueMap.get(valueId);

      if (!value) {
        errors.push(
          `Producto ${itemIndex + 1}: valor ${valueId} inválido para ${option.name}.`
        );
        continue;
      }

      values.push(value);
    }

    if (values.length !== valueIds.length) {
      continue;
    }

    const optionPriceDelta = values.reduce(
      (sum, value) => sum + (value.priceDelta ?? 0),
      0
    );

    selectedOptions.push({
      optionId: option.id,
      optionName: option.name,
      valueIds: values.map((value) => value.id),
      valueLabels: values.map((value) => value.label),
      priceDeltaTotal: Math.round(optionPriceDelta * 100) / 100,
    });
    priceDeltaTotal += optionPriceDelta;
  }

  for (const option of activeOptions) {
    if (option.required && !selectedOptionIds.has(option.id)) {
      errors.push(`Producto ${itemIndex + 1}: falta ${option.name}.`);
    }
  }

  return {
    selectedOptions,
    priceDeltaTotal: Math.round(priceDeltaTotal * 100) / 100,
    errors,
  };
}

async function validateOrderAgainstCatalog(order: Order): Promise<CatalogValidationResult> {
  const uniqueProductIds = [...new Set(order.productos.map((item) => item.id))];
  const productRefs = uniqueProductIds.map((productId) =>
    adminDb
      .collection("tenants")
      .doc(order.tenantId)
      .collection("products")
      .doc(productId)
  );
  const productSnapshots = await adminDb.getAll(...productRefs);
  const productMap = new Map<string, CatalogProduct>();
  const errors: string[] = [];

  productSnapshots.forEach((snapshot) => {
    const product = mapCatalogProduct(
      snapshot.id,
      snapshot.exists ? (snapshot.data() as CatalogProductRecord) : undefined
    );

    if (product) {
      productMap.set(product.id, product);
    }
  });

  const productos: OrderItem[] = [];
  order.productos.forEach((item, index) => {
    const product = productMap.get(item.id);

    if (!product || !product.active || !product.available) {
      errors.push(`Producto ${index + 1}: no existe o no está disponible.`);
      return;
    }

    const optionValidation = validateSelectedOptions(item, product, index);

    if (optionValidation.errors.length > 0) {
      errors.push(...optionValidation.errors);
      return;
    }

    productos.push({
      id: product.id,
      nombre: product.name,
      pricingMode: product.pricingMode,
      precio: product.pricingMode === "fixed" ? product.price ?? 0 : null,
      cantidad: item.cantidad,
      quoteRequired: product.pricingMode === "quote",
      selectedOptions: optionValidation.selectedOptions,
      notes: item.notes,
    });
  });

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  const deliveryFee =
    order.deliveryType === "delivery" && typeof order.deliveryFee === "number"
      ? order.deliveryFee
      : 0;
  const pricingSummary = buildOrderPricingSummary(productos, deliveryFee);

  return {
    valid: true,
    order: {
      ...order,
      productos,
      total: pricingSummary.total,
      hasQuoteItems: pricingSummary.hasQuoteItems,
      totalMode: pricingSummary.totalMode,
      deliveryFee: order.deliveryType === "delivery" ? deliveryFee : undefined,
    },
  };
}

async function getTenantOrderContext(
  tenantId: string
): Promise<TenantOrderContext> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const tenantRecord = (tenantSnapshot.data() ?? {}) as TenantOrderConfirmationPolicyRecord;

  if (!isTenantAvailable(tenantRecord)) {
    throw new Error("TENANT_INACTIVE");
  }

  const tenantSlug =
    typeof tenantRecord.slug === "string" && tenantRecord.slug.trim().length > 0
      ? tenantRecord.slug.trim()
      : tenantId;

  return {
    confirmationPolicy: normalizeOrderConfirmationPolicy(
      tenantRecord.orderConfirmationPolicy
    ),
    tenantSlug,
  };
}

function applyOrderConfirmationPolicy(
  order: Order,
  policy: OrderConfirmationPolicy
): { order: Order; requiresConfirmation: boolean } {
  const requiresConfirmation =
    policy.enabled &&
    policy.action === "require_manual_confirmation" &&
    order.total >= policy.amountThreshold;

  return {
    order: {
      ...order,
      estado: requiresConfirmation ? "requires_confirmation" : order.estado,
    },
    requiresConfirmation,
  };
}

function createInitialWhatsAppState(): OrderWhatsAppState {
  return {
    attempted: false,
    sent: false,
    messageId: null,
    error: null,
    sentAt: null,
  };
}

function createDeliveredWhatsAppState(
  whatsappDelivery: {
    success: boolean;
    status: OrderWhatsAppState["status"];
    messageId: string | null;
    error: string | null;
  }
): OrderWhatsAppState {
  return {
    attempted: true,
    sent: whatsappDelivery.success,
    status: whatsappDelivery.status,
    messageId: whatsappDelivery.messageId,
    error: whatsappDelivery.error,
    sentAt: whatsappDelivery.success ? Date.now() : null,
  };
}

function buildOrderWarning(messages: Array<string | null>): string | undefined {
  const filteredMessages = messages.filter(
    (message): message is string =>
      typeof message === "string" && message.trim().length > 0
  );

  return filteredMessages.length > 0 ? filteredMessages.join(" ") : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = orderValidatorAgent(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido inválido.",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const catalogValidation = await validateOrderAgainstCatalog(validation.data);

    if (!catalogValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido inválido.",
          errors: catalogValidation.errors,
        },
        { status: 400 }
      );
    }

    const tenantContext = await getTenantOrderContext(
      catalogValidation.order.tenantId
    );
    const tenantOrderFlow = await tenantOrderFlowConfigAgent(
      catalogValidation.order.tenantId
    );
    const customerProfileResult = await upsertCustomerProfile({
      tenantId: catalogValidation.order.tenantId,
      tenantSlug: catalogValidation.order.tenantSlug ?? tenantContext.tenantSlug,
      displayName: catalogValidation.order.cliente.nombre,
      phone: catalogValidation.order.cliente.telefono,
      customerCode: catalogValidation.order.cliente.customerCode,
      address:
        catalogValidation.order.deliveryType !== "delivery"
          ? undefined
          : catalogValidation.order.deliveryAddressDetails
            ? {
                street:
                  `${catalogValidation.order.deliveryAddressDetails.street} ${catalogValidation.order.deliveryAddressDetails.number}`.trim(),
                neighborhood:
                  catalogValidation.order.deliveryAddressDetails.neighborhood,
                references:
                  catalogValidation.order.deliveryAddressDetails.reference,
              }
            : catalogValidation.order.deliveryAddress
              ? {
                  street: catalogValidation.order.deliveryAddress,
                }
              : undefined,
    });
    const orderWithCustomer: Order = {
      ...catalogValidation.order,
      tenantSlug: tenantContext.tenantSlug,
      cliente: {
        ...catalogValidation.order.cliente,
        customerCode: customerProfileResult.customerProfile.customerCode,
      },
      customer: {
        customerId: customerProfileResult.customerProfile.id,
        customerCode: customerProfileResult.customerProfile.customerCode,
        nombre: catalogValidation.order.cliente.nombre,
        telefono: catalogValidation.order.cliente.telefono,
      },
      customerId: customerProfileResult.customerProfile.id,
      customerCode: customerProfileResult.customerProfile.customerCode,
    };
    const orderConfirmation = applyOrderConfirmationPolicy(
      orderWithCustomer,
      tenantContext.confirmationPolicy
    );
    const orderToPersist: Order = {
      ...orderConfirmation.order,
      customerId: customerProfileResult.customerProfile.id,
      customerCode: customerProfileResult.customerProfile.customerCode,
      orderFlowMode: tenantOrderFlow.config.orderFlowMode,
      orderState: orderConfirmation.order.estado,
      whatsapp: createInitialWhatsAppState(),
    };

    const persistedOrder = await firestoreWriterAgent(orderToPersist);

    if (!persistedOrder.success) {
      return NextResponse.json(
        {
          success: false,
          message: persistedOrder.message,
        },
        { status: 500 }
      );
    }

    const whatsappMessage = whatsappComandaAgent(orderConfirmation.order);
    const whatsappDelivery = await whatsappSenderAgent({
      tenantId: orderConfirmation.order.tenantId,
      whatsappMessage,
    });
    const whatsappState = createDeliveredWhatsAppState(whatsappDelivery);
    let persistenceWarning: string | null = null;

    try {
      await updateFirestoreOrderWhatsAppAgent({
        tenantId: orderConfirmation.order.tenantId,
        orderId: persistedOrder.orderId,
        whatsapp: whatsappState,
      });
    } catch (error) {
      console.error("Error actualizando estado WhatsApp de la orden:", error);
      persistenceWarning =
        "El pedido se guardó, pero no se pudo actualizar la metadata de WhatsApp en Firestore.";
    }

    const shouldSendCustomerConfirmation =
      tenantOrderFlow.config.orderFlowMode === "simple_whatsapp" &&
      whatsappDelivery.success &&
      !orderConfirmation.requiresConfirmation;
    const customerConfirmationMessage = shouldSendCustomerConfirmation
      ? customerConfirmationAgent({
          order: orderConfirmation.order,
          tenantName: tenantOrderFlow.tenantName,
          estimatedPreparationMinutes:
            tenantOrderFlow.config.estimatedPreparationMinutes,
        })
      : null;
    const customerConfirmationDelivery = customerConfirmationMessage
      ? await whatsappSenderAgent({
          tenantId: orderConfirmation.order.tenantId,
          whatsappMessage: customerConfirmationMessage,
          recipientPhone: orderConfirmation.order.cliente.telefono,
        })
      : null;
    const deliveredCustomerConfirmation =
      customerConfirmationDelivery?.success ?? false;
    const whatsappWarning = !whatsappDelivery.success
      ? "El pedido se guardó correctamente, pero falló el envío por WhatsApp."
      : null;
    const customerConfirmationWarning =
      shouldSendCustomerConfirmation && !deliveredCustomerConfirmation
        ? "Falló la confirmación al cliente por WhatsApp."
        : null;
    const warning = buildOrderWarning([
      customerProfileResult.warning ?? null,
      whatsappWarning,
      customerConfirmationWarning,
      persistenceWarning,
    ]);
    const message = !whatsappDelivery.success
      ? "Pedido guardado correctamente."
      : shouldSendCustomerConfirmation
        ? deliveredCustomerConfirmation
          ? "Pedido guardado, enviado al negocio y confirmado al cliente por WhatsApp."
          : "Pedido guardado y enviado al negocio por WhatsApp, pero falló la confirmación al cliente."
        : "Pedido guardado y enviado por WhatsApp correctamente.";

    return NextResponse.json(
      {
        success: true,
        message,
        orderId: persistedOrder.orderId,
        customerCode: customerProfileResult.customerProfile.customerCode,
        customerProfileWarning: customerProfileResult.warning,
        warning,
        order: {
          ...orderToPersist,
          orderId: persistedOrder.orderId,
          whatsapp: whatsappState,
        },
        requiresConfirmation: orderConfirmation.requiresConfirmation,
        tenantOrderFlow,
        whatsapp: whatsappState,
        whatsappMessage,
        whatsappDelivery,
        customerConfirmationMessage,
        customerConfirmationDelivery,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          message: "El tenant no existe.",
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "TENANT_INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "El tenant no está disponible.",
        },
        { status: 404 }
      );
    }

    console.error("Error procesando pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno procesando pedido.",
      },
      { status: 500 }
    );
  }
}
