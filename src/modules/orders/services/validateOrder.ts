import { CartItem } from "@/types/cart.types";

export interface ValidateOrderInput {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
}

export function validateOrder(input: ValidateOrderInput): void {
  if (!input.tenantId.trim()) {
    throw new Error("Tenant ID is required");
  }

  if (!input.customerName.trim()) {
    throw new Error("Customer name is required");
  }

  if (!input.customerPhone.trim()) {
    throw new Error("Customer phone is required");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order must contain at least one item");
  }
}
