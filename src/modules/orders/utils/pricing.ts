import type { CartItem } from "@/types/cart.types";
import {
  normalizeProductPricingMode,
  type ProductPricingMode,
  type SelectedProductOption,
} from "@/types/product.types";
import type { OrderItem, OrderTotalMode } from "../types/order";

type PricedItem = {
  pricingMode?: ProductPricingMode;
  unitPrice?: number | null;
  precio?: number | null;
  selectedOptions?: SelectedProductOption[];
  quantity?: number;
  cantidad?: number;
};

function getItemQuantity(item: PricedItem): number {
  if (typeof item.quantity === "number" && Number.isFinite(item.quantity)) {
    return item.quantity;
  }

  if (typeof item.cantidad === "number" && Number.isFinite(item.cantidad)) {
    return item.cantidad;
  }

  return 0;
}

export function getPricingMode(input: {
  pricingMode?: unknown;
  price?: unknown;
  unitPrice?: unknown;
  precio?: unknown;
}): ProductPricingMode {
  return normalizeProductPricingMode({
    pricingMode: input.pricingMode,
    price: input.price ?? input.unitPrice ?? input.precio,
  });
}

export function getSelectedOptionsTotal(
  selectedOptions: SelectedProductOption[] | undefined
): number {
  return (selectedOptions ?? []).reduce(
    (sum, option) => sum + option.priceDeltaTotal,
    0
  );
}

export function getFixedUnitAmount(item: PricedItem): number {
  if (getPricingMode(item) === "quote") {
    return 0;
  }

  const basePrice =
    typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice)
      ? item.unitPrice
      : typeof item.precio === "number" && Number.isFinite(item.precio)
        ? item.precio
        : 0;

  return Math.round((basePrice + getSelectedOptionsTotal(item.selectedOptions)) * 100) / 100;
}

export function calculateItemsSubtotal(items: PricedItem[]): number {
  return Math.round(
    items.reduce(
      (sum, item) => sum + getFixedUnitAmount(item) * getItemQuantity(item),
      0
    ) * 100
  ) / 100;
}

export function hasQuoteItems(
  items: Array<{ pricingMode?: ProductPricingMode; unitPrice?: number | null; precio?: number | null }>
): boolean {
  return items.some((item) => getPricingMode(item) === "quote");
}

export function getOrderTotalMode(
  items: Array<{ pricingMode?: ProductPricingMode; unitPrice?: number | null; precio?: number | null }>
): OrderTotalMode {
  const containsQuoteItems = hasQuoteItems(items);

  if (!containsQuoteItems) {
    return "fixed";
  }

  const containsFixedItems = items.some((item) => getPricingMode(item) === "fixed");

  return containsFixedItems ? "partial_quote" : "quote_only";
}

export function buildCartPricingSummary(
  items: CartItem[],
  deliveryFee: number
): {
  subtotal: number;
  total: number;
  hasQuoteItems: boolean;
  totalMode: OrderTotalMode;
} {
  const subtotal = calculateItemsSubtotal(items);
  const containsQuoteItems = hasQuoteItems(items);
  const totalMode = getOrderTotalMode(items);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  return {
    subtotal,
    total,
    hasQuoteItems: containsQuoteItems,
    totalMode,
  };
}

export function buildOrderPricingSummary(
  items: OrderItem[],
  deliveryFee = 0
): {
  total: number;
  hasQuoteItems: boolean;
  totalMode: OrderTotalMode;
} {
  const subtotal = calculateItemsSubtotal(items);
  const containsQuoteItems = hasQuoteItems(items);
  const totalMode = getOrderTotalMode(items);

  return {
    total: Math.round((subtotal + deliveryFee) * 100) / 100,
    hasQuoteItems: containsQuoteItems,
    totalMode,
  };
}
