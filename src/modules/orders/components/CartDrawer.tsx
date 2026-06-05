"use client";

import { AppButton } from "@/components/ui/AppButton";
import type { CartItem } from "@/types/cart.types";

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onIncreaseItem: (productId: string) => void;
  onDecreaseItem: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onGenerateOrder: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CartDrawer({
  isOpen,
  items,
  total,
  onClose,
  onIncreaseItem,
  onDecreaseItem,
  onRemoveItem,
  onGenerateOrder,
}: CartDrawerProps) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar carrito"
          onClick={onClose}
          className="fixed inset-0 z-30 touch-manipulation bg-black/60 transition-all duration-150 active:bg-black/70"
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-[var(--tenant-ring)] bg-[var(--tenant-surface)] text-[var(--tenant-text)] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-[var(--tenant-ring)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--tenant-accent)]">
              Pedido en curso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--tenant-text)]">
              Carrito
            </h2>
          </div>
          <AppButton
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="!border-[var(--tenant-ring)] !bg-[var(--tenant-subtle)] text-[var(--tenant-text)] hover:!bg-[var(--tenant-background)] active:!bg-[var(--tenant-subtle)] focus-visible:ring-offset-[var(--tenant-surface)]"
          >
            Cerrar
          </AppButton>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-[var(--tenant-radius)] border border-dashed border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-6 text-sm leading-6 text-[var(--tenant-muted)]">
              Tu carrito está vacío. Agrega productos del menú para recalcular el total.
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.productId}
              className="rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[var(--tenant-text)]">
                    {item.productName}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--tenant-muted)]">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-[var(--tenant-muted)]">
                      {item.notes}
                    </p>
                  ) : null}
                </div>

                <AppButton
                  onClick={() => onRemoveItem(item.productId)}
                  variant="ghost"
                  size="sm"
                    className="min-h-[44px] text-rose-300 hover:!bg-rose-500/10 hover:text-rose-200 active:!bg-rose-500/20 focus-visible:ring-offset-[var(--tenant-subtle)]"
                >
                  Quitar
                </AppButton>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AppButton
                    onClick={() => onDecreaseItem(item.productId)}
                    variant="secondary"
                    size="sm"
                    className="h-11 w-11 !border-[var(--tenant-ring)] !bg-[var(--tenant-background)] px-0 text-lg text-[var(--tenant-text)] hover:!bg-[var(--tenant-surface)] active:!bg-[var(--tenant-subtle)] focus-visible:ring-offset-[var(--tenant-subtle)]"
                    aria-label={`Quitar una unidad de ${item.productName}`}
                  >
                    -
                  </AppButton>
                  <span className="min-w-6 text-center text-sm font-semibold text-[var(--tenant-text)]">
                    {item.quantity}
                  </span>
                  <AppButton
                    onClick={() => onIncreaseItem(item.productId)}
                    variant="secondary"
                    size="sm"
                    className="h-11 w-11 !border-[var(--tenant-ring)] !bg-[var(--tenant-background)] px-0 text-lg text-[var(--tenant-text)] hover:!bg-[var(--tenant-surface)] active:!bg-[var(--tenant-subtle)] focus-visible:ring-offset-[var(--tenant-subtle)]"
                    aria-label={`Agregar una unidad de ${item.productName}`}
                  >
                    +
                  </AppButton>
                </div>

                <p className="text-base font-semibold text-[var(--tenant-accent)]">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-[var(--tenant-ring)] px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[var(--tenant-muted)]">
            <span>Total</span>
            <span className="text-2xl font-semibold text-[var(--tenant-text)]">
              {formatCurrency(total)}
            </span>
          </div>
          <AppButton
            onClick={onGenerateOrder}
            disabled={items.length === 0}
            className="w-full !border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] px-5 py-3 text-sm text-[var(--tenant-button-text)] hover:!bg-[var(--tenant-primary-hover)] active:!bg-[var(--tenant-primary)] focus-visible:ring-offset-[var(--tenant-surface)] disabled:!bg-[var(--tenant-subtle)] disabled:text-[var(--tenant-muted)]"
          >
            Generar pedido
          </AppButton>
        </div>
      </aside>
    </>
  );
}
