import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { upsertCustomerProfile } from "@/modules/customers/server/upsertCustomerProfile";
import { customerConfirmationAgent } from "@/modules/orders/agents/customerConfirmationAgent";
import { firestoreWriterAgent } from "@/modules/orders/agents/firestoreWriterAgent";
import { orderValidatorAgent } from "@/modules/orders/agents/orderValidatorAgent";
import { tenantOrderFlowConfigAgent } from "@/modules/orders/agents/tenantOrderFlowConfigAgent";
import { whatsappComandaAgent } from "@/modules/orders/agents/whatsappComandaAgent";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";
import type { Order, OrderItem } from "@/modules/orders/types/order";
import type {
  ProductOption,
  ProductOptionValue,
  SelectedProductOption,
} from "@/types/product.types";

interface OrderConfirmationPolicyRecord {
  enabled?: unknown;
  amountThreshold?: unknown;
  action?: unknown;
}

interface TenantOrderConfirmationPolicyRecord {
  orderConfirmationPolicy?: unknown;
  slug?: unknown;
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
  price?: unknown;
  active?: unknown;
  available?: unknown;
  options?: unknown;
  deletedAt?: unknown;
}

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
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
  if (!record || !isNonEmptyString(record.name) || typeof record.price !== "number") {
    return null;
  }

  if (record.deletedAt !== null && record.deletedAt !== undefined) {
    return null;
  }

  const active = typeof record.active === "boolean" ? record.active : true;

  return {
    id,
    name: record.name.trim(),
    price: Math.round(record.price * 100) / 100,
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
  let subtotal = 0;

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
      precio: product.price,
      cantidad: item.cantidad,
      selectedOptions: optionValidation.selectedOptions,
    });
    subtotal += (product.price + optionValidation.priceDeltaTotal) * item.cantidad;
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
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  return {
    valid: true,
    order: {
      ...order,
      productos,
      total,
      deliveryFee: order.deliveryType === "delivery" ? deliveryFee : undefined,
    },
  };
}

async function getTenantOrderContext(
  tenantId: string
): Promise<TenantOrderContext> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();
  const tenantRecord = (tenantSnapshot.data() ?? {}) as TenantOrderConfirmationPolicyRecord;
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
    };
    const orderConfirmation = applyOrderConfirmationPolicy(
      orderWithCustomer,
      tenantContext.confirmationPolicy
    );

    const persistedOrder = await firestoreWriterAgent(orderConfirmation.order);

    if (!persistedOrder.success) {
      return NextResponse.json(
        {
          success: false,
          message: persistedOrder.message,
        },
        { status: 500 }
      );
    }

    const tenantOrderFlow = await tenantOrderFlowConfigAgent(
      orderConfirmation.order.tenantId
    );
    const whatsappMessage = whatsappComandaAgent(orderConfirmation.order);
    const whatsappDelivery = await whatsappSenderAgent({
      tenantId: orderConfirmation.order.tenantId,
      whatsappMessage,
    });
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
    const message = !whatsappDelivery.success
      ? "Pedido guardado correctamente, pero falló el envío por WhatsApp."
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
        order: orderConfirmation.order,
        requiresConfirmation: orderConfirmation.requiresConfirmation,
        tenantOrderFlow,
        whatsappMessage,
        whatsappDelivery,
        customerConfirmationMessage,
        customerConfirmationDelivery,
      },
      { status: 201 }
    );
  } catch (error) {
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
