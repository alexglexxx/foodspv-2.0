import { ORDER_STATES, type Order } from "../types/order";

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

    if (
      order.cliente.customerCode !== undefined &&
      typeof order.cliente.customerCode !== "string"
    ) {
      errors.push("Código de cliente inválido.");
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

      if (producto.selectedOptions !== undefined) {
        if (!Array.isArray(producto.selectedOptions)) {
          errors.push(`Producto ${index + 1}: opciones inválidas.`);
        } else {
          producto.selectedOptions.forEach((option, optionIndex) => {
            if (!option || typeof option !== "object") {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: formato inválido.`
              );
              return;
            }

            if (
              typeof option.optionId !== "string" ||
              option.optionId.trim().length === 0
            ) {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: falta optionId.`
              );
            }

            if (
              typeof option.optionName !== "string" ||
              option.optionName.trim().length === 0
            ) {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: falta optionName.`
              );
            }

            if (
              !Array.isArray(option.valueIds) ||
              option.valueIds.some(
                (valueId) =>
                  typeof valueId !== "string" || valueId.trim().length === 0
              )
            ) {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: valueIds inválidos.`
              );
            }

            if (
              !Array.isArray(option.valueLabels) ||
              option.valueLabels.some(
                (label) => typeof label !== "string" || label.trim().length === 0
              )
            ) {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: valueLabels inválidos.`
              );
            }

            if (
              typeof option.priceDeltaTotal !== "number" ||
              !Number.isFinite(option.priceDeltaTotal) ||
              option.priceDeltaTotal < 0
            ) {
              errors.push(
                `Producto ${index + 1}, opción ${optionIndex + 1}: priceDeltaTotal inválido.`
              );
            }
          });
        }
      }
    });
  }

  if (typeof order.total !== "number" || order.total <= 0) {
    errors.push("Total inválido.");
  }

  if (
    order.deliveryType !== undefined &&
    order.deliveryType !== "pickup" &&
    order.deliveryType !== "delivery"
  ) {
    errors.push("Tipo de entrega inválido.");
  }

  if (order.deliveryType === "delivery") {
    const deliveryAddressDetails =
      order.deliveryAddressDetails &&
      typeof order.deliveryAddressDetails === "object"
        ? order.deliveryAddressDetails
        : null;
    const legacyDeliveryAddress =
      typeof order.deliveryAddress === "string" ? order.deliveryAddress.trim() : "";

    if (
      !deliveryAddressDetails ||
      typeof deliveryAddressDetails.street !== "string" ||
      deliveryAddressDetails.street.trim().length === 0 ||
      typeof deliveryAddressDetails.number !== "string" ||
      deliveryAddressDetails.number.trim().length === 0 ||
      typeof deliveryAddressDetails.neighborhood !== "string" ||
      deliveryAddressDetails.neighborhood.trim().length === 0 ||
      typeof deliveryAddressDetails.reference !== "string" ||
      deliveryAddressDetails.reference.trim().length === 0
    ) {
      if (legacyDeliveryAddress.length === 0) {
        errors.push(
          "Agrega calle, número, colonia y referencia para enviar tu pedido a domicilio."
        );
      } else {
        delete order.deliveryAddressDetails;
        order.deliveryAddress = legacyDeliveryAddress;
      }
    } else {
      order.deliveryAddressDetails = {
        street: deliveryAddressDetails.street.trim(),
        number: deliveryAddressDetails.number.trim(),
        neighborhood: deliveryAddressDetails.neighborhood.trim(),
        reference: deliveryAddressDetails.reference.trim(),
      };
      order.deliveryAddress = [
        `${order.deliveryAddressDetails.street} ${order.deliveryAddressDetails.number}`.trim(),
        order.deliveryAddressDetails.neighborhood,
        order.deliveryAddressDetails.reference,
      ].join(", ");
    }

    if (
      order.deliveryFee !== undefined &&
      (typeof order.deliveryFee !== "number" ||
        !Number.isFinite(order.deliveryFee) ||
        order.deliveryFee < 0)
    ) {
      errors.push("Costo de envío inválido.");
    }
  } else {
    delete order.deliveryAddress;
    delete order.deliveryAddressDetails;
    delete order.deliveryFee;
  }

  if (!order.estado) {
    order.estado = "pendiente";
  } else if (!ORDER_STATES.includes(order.estado)) {
    errors.push("Estado de pedido inválido.");
  }

  if (!order.createdAt) {
    order.createdAt = Date.now();
  }

  if (typeof order.tenantSlug !== "string" || order.tenantSlug.trim().length === 0) {
    delete order.tenantSlug;
  } else {
    order.tenantSlug = order.tenantSlug.trim();
  }

  if (order.cliente?.customerCode) {
    order.cliente.customerCode = order.cliente.customerCode.trim();
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
