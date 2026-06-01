"use client";

import { AppButton } from "@/components/ui/AppButton";
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
        <AppButton
          onClick={onOpenCart}
          disabled={!hasItems}
          variant="secondary"
          className="min-w-0 flex-1 justify-between rounded-2xl !border-[#6b5138] !bg-[#463426] px-4 py-3 text-left text-[#fff7ed] ring-1 ring-[#6b5138] hover:!bg-[#5a422e] active:!bg-[#3a2b1f] focus-visible:ring-offset-[#3a2b1f] disabled:text-[#b99f80]"
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
        </AppButton>

        <AppButton
          onClick={onGenerateOrder}
          disabled={!hasItems}
          className="shrink-0 rounded-2xl !border-orange-600 !bg-orange-600 px-4 py-3 text-sm text-[#fff7ed] hover:!bg-orange-500 active:!bg-orange-700 focus-visible:ring-offset-[#3a2b1f] disabled:!bg-[#463426] disabled:text-[#b99f80]"
        >
          Pedir
        </AppButton>
      </div>
    </section>
  );
}
