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
    <section className="fixed inset-x-0 bottom-0 z-50 border-t border-[#6b5138] bg-[#3a2b1f]/95 px-4 py-3 shadow-[0_-12px_30px_rgba(43,33,24,0.42)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={onOpenCart}
          disabled={!hasItems}
          className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-[#463426] px-4 py-3 text-left text-[#fff7ed] ring-1 ring-[#6b5138] transition hover:bg-[#5a422e] disabled:cursor-not-allowed disabled:text-[#b99f80]"
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
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
          className="shrink-0 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-bold text-[#fff7ed] transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#463426] disabled:text-[#b99f80]"
        >
          Pedir
        </button>
      </div>
    </section>
  );
}
