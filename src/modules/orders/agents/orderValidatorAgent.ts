import { ORDER_STATES, Order } from "../types/order";

export type ValidationResult =
  | {
      valid: true;
      data: Order;
    }
  | {
      valid: false;
      errors: string[];
    };

export function orderValidatorAgent(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: ["El pedido no tiene formato válido."],
    };
  }

  const order = input as Partial<Order>;

  if (!order.tenantId || typeof order.tenantId !== "string") {
    errors.push("Falta tenantId.");
  }

  if (!order.cliente || typeof order.cliente !== "object") {
    errors.push("Falta información del cliente.");
  } else {
    if (!order.cliente.nombre || typeof order.cliente.nombre !== "string") {
      errors.push("Falta nombre del cliente.");
    }

    if (!order.cliente.telefono || typeof order.cliente.telefono !== "string") {
      errors.push("Falta teléfono del cliente.");
    }

    if (
      typeof order.cliente.telefono === "string" &&
      order.cliente.telefono.trim().length < 8
    ) {
      errors.push("El teléfono del cliente parece inválido.");
    }
  }

  if (!Array.isArray(order.productos) || order.productos.length === 0) {
    errors.push("El pedido no tiene productos.");
  } else {
    order.productos.forEach((producto, index) => {
      if (!producto.id) {
        errors.push(`Producto ${index + 1}: falta id.`);
      }

      if (!producto.nombre) {
        errors.push(`Producto ${index + 1}: falta nombre.`);
      }

      if (typeof producto.precio !== "number" || producto.precio < 0) {
        errors.push(`Producto ${index + 1}: precio inválido.`);
      }

      if (
        typeof producto.cantidad !== "number" ||
        producto.cantidad <= 0 ||
        !Number.isInteger(producto.cantidad)
      ) {
        errors.push(`Producto ${index + 1}: cantidad inválida.`);
      }
    });
  }

  if (typeof order.total !== "number" || order.total <= 0) {
    errors.push("Total inválido.");
  }

  if (!order.estado) {
    order.estado = "pendiente";
  } else if (!ORDER_STATES.includes(order.estado)) {
    errors.push("Estado de pedido inválido.");
  }

  if (!order.createdAt) {
    order.createdAt = Date.now();
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    data: order as Order,
  };
}
