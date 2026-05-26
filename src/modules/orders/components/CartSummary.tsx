"use client";

import type { CartItem } from "@/types/cart.types";

interface CartSummaryProps {
  items: CartItem[];
  total: number;
  onOpenCart: () => void;
  onGenerateOrder: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CartSummary({
  items,
  total,
  onOpenCart,
  onGenerateOrder,
}: CartSummaryProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="sticky bottom-4 z-20 mt-8 rounded-[2rem] border border-stone-900 bg-stone-950 p-5 text-white shadow-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            Carrito activo
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {itemCount} producto{itemCount === 1 ? "" : "s"} seleccionados
          </h2>
          <p className="mt-1 text-sm text-stone-300">
            Total actualizado automáticamente conforme agregas productos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onOpenCart}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Ver carrito
            </button>
            <button
              type="button"
              onClick={onGenerateOrder}
              disabled={items.length === 0}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-300"
            >
              Generar pedido
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
