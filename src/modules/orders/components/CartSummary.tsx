"use client";

import { AppButton } from "@/components/ui/AppButton";
import type { CartItem } from "@/types/cart.types";
import type { OrderTotalMode } from "../types/order";

interface CartSummaryProps {
  items: CartItem[];
  total: number;
  hasQuoteItems: boolean;
  totalMode: OrderTotalMode;
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
  hasQuoteItems,
  totalMode,
  onOpenCart,
  onGenerateOrder,
}: CartSummaryProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = itemCount > 0;

  return (
    <section className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--tenant-ring)] bg-[var(--tenant-surface)]/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,15,16,0.35)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <AppButton
          onClick={onOpenCart}
          disabled={!hasItems}
          variant="secondary"
          className="min-w-0 flex-1 justify-between rounded-[var(--tenant-radius)] !border-[var(--tenant-ring)] !bg-[var(--tenant-subtle)] px-4 py-3 text-left text-[var(--tenant-text)] ring-1 ring-[var(--tenant-ring)] hover:!bg-[var(--tenant-surface)] active:!bg-[var(--tenant-subtle)] focus-visible:ring-offset-[var(--tenant-surface)] disabled:text-[var(--tenant-muted)]"
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent)]">
              Carrito
            </span>
            <span className="block truncate text-sm font-semibold">
              {hasItems
                ? `${itemCount} producto${itemCount === 1 ? "" : "s"}`
                : "Sin productos"}
            </span>
          </span>

          <span className="shrink-0 text-base font-bold">
            {totalMode === "quote_only"
              ? "Por cotizar"
              : hasQuoteItems
                ? `Parcial ${formatCurrency(total)}`
                : formatCurrency(total)}
          </span>
        </AppButton>

        <AppButton
          onClick={onGenerateOrder}
          disabled={!hasItems}
          className="shrink-0 rounded-[var(--tenant-radius)] !border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] px-4 py-3 text-sm text-[var(--tenant-button-text)] hover:!bg-[var(--tenant-primary-hover)] active:!bg-[var(--tenant-primary)] focus-visible:ring-offset-[var(--tenant-surface)] disabled:!bg-[var(--tenant-subtle)] disabled:text-[var(--tenant-muted)]"
        >
          {hasQuoteItems ? "Completar pedido" : "Pedir"}
        </AppButton>
      </div>
      {hasQuoteItems ? (
        <p className="mx-auto mt-2 w-full max-w-3xl text-xs font-medium text-[var(--tenant-muted)]">
          Este pedido incluye productos por cotizar. Completa tu pedido y el
          negocio se comunicará contigo para confirmar precio, detalles y
          disponibilidad.
        </p>
      ) : null}
    </section>
  );
}
