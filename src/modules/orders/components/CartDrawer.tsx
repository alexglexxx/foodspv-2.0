"use client";

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
          className="fixed inset-0 z-30 bg-[color-mix(in_srgb,var(--tenant-background)_70%,transparent)]"
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-[var(--tenant-secondary)] bg-[var(--tenant-surface)] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-[var(--tenant-secondary)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--tenant-accent)]">
              Pedido en curso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--tenant-text)]">Carrito</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--tenant-secondary)] bg-[var(--tenant-secondary)] px-3 py-2 text-sm font-semibold text-[var(--tenant-text)] transition brightness-100 hover:brightness-110"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--tenant-secondary)] bg-[var(--tenant-secondary)] p-6 text-sm leading-6 text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)]">
              Tu carrito está vacío. Agrega productos del menú para recalcular el total.
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.productId}
              className="rounded-3xl border border-[var(--tenant-secondary)] bg-[var(--tenant-secondary)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[var(--tenant-text)]">
                    {item.productName}
                  </h3>
                  <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)]">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)]">{item.notes}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.productId)}
                  className="text-sm font-semibold text-rose-300 transition hover:text-rose-200"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onDecreaseItem(item.productId)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--tenant-secondary)] bg-[var(--tenant-background)] text-lg font-semibold text-[var(--tenant-text)] transition brightness-100 hover:brightness-110"
                  >
                    -
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold text-[var(--tenant-text)]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncreaseItem(item.productId)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--tenant-secondary)] bg-[var(--tenant-background)] text-lg font-semibold text-[var(--tenant-text)] transition brightness-100 hover:brightness-110"
                  >
                    +
                  </button>
                </div>

                <p className="text-base font-semibold text-[var(--tenant-accent)]">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-[var(--tenant-secondary)] px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)]">
            <span>Total</span>
            <span className="text-2xl font-semibold text-[var(--tenant-text)]">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateOrder}
            disabled={items.length === 0}
            className="w-full rounded-full bg-[var(--tenant-primary)] px-5 py-3 text-sm font-semibold text-white transition brightness-100 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--tenant-secondary)] disabled:text-[color-mix(in_srgb,var(--tenant-text)_58%,transparent)]"
          >
            Generar pedido
          </button>
        </div>
      </aside>
    </>
  );
}
