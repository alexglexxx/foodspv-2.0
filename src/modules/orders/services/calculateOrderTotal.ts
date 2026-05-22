import { CartItem } from "@/types/cart.types";

export function calculateOrderTotal(items: CartItem[]): number {
  if (!Array.isArray(items)) {
    throw new Error("Items must be an array");
  }

  return items.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product: ${item.productName}`);
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for product: ${item.productName}`);
    }

    return total + quantity * unitPrice;
  }, 0);
}
