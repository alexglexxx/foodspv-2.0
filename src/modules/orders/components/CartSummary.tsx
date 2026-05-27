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
  const hasItems = itemCount > 0;

  return (
    <section className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={onOpenCart}
          disabled={!hasItems}
          className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-stone-950 px-4 py-3 text-left text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
              Carrito
            </span>
            <span className="block truncate text-sm font-semibold">
              {hasItems
                ? `${itemCount} producto${itemCount === 1 ? "" : "s"}`
                : "Sin productos"}
            </span>
          </span>

          <span className="shrink-0 text-base font-bold">
            {formatCurrency(total)}
          </span>
        </button>

        <button
          type="button"
          onClick={onGenerateOrder}
          disabled={!hasItems}
          className="shrink-0 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
        >
          Pedir
        </button>
      </div>
    </section>
  );
}
