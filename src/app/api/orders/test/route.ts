import { NextResponse } from "next/server";

import { calculateOrderTotal } from "@/modules/orders/services/calculateOrderTotal";
import { formatComanda } from "@/modules/orders/services/formatComanda";
import { validateOrder } from "@/modules/orders/services/validateOrder";

export async function GET() {
  const order = {
    id: crypto.randomUUID(),

    tenantId: "taqueria-el-primo",

    customerName: "Juan Pérez",

    customerPhone: "3221234567",

    items: [
      {
        productId: "1",
        productName: "Taco Pastor",
        quantity: 3,
        unitPrice: 25,
        notes: "Sin cebolla",
      },
      {
        productId: "2",
        productName: "Coca Cola",
        quantity: 1,
        unitPrice: 35,
      },
    ],

    total: 0,

    status: "pending" as const,

    createdAt: new Date(),
  };

  validateOrder(order);

  order.total = calculateOrderTotal(order.items);

  const comanda = formatComanda(order);

  return NextResponse.json({
    success: true,
    comanda,
  });
}
