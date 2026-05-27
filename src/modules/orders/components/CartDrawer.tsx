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
          className="fixed inset-0 z-30 bg-[#120f0b]/70"
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-[#3a2d22] bg-[#1c1712] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-[#3a2d22] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
              Pedido en curso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#fff7ed]">Carrito</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#3a2d22] bg-[#241d16] px-3 py-2 text-sm font-semibold text-[#fff7ed] transition hover:bg-[#2b231a]"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#3a2d22] bg-[#241d16] p-6 text-sm leading-6 text-[#c8b8a3]">
              Tu carrito está vacío. Agrega productos del menú para recalcular el total.
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.productId}
              className="rounded-3xl border border-[#3a2d22] bg-[#241d16] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[#fff7ed]">
                    {item.productName}
                  </h3>
                  <p className="mt-1 text-sm text-[#c8b8a3]">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-[#c8b8a3]">{item.notes}</p>
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a2d22] bg-[#120f0b] text-lg font-semibold text-[#fff7ed] transition hover:bg-[#2b231a]"
                  >
                    -
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold text-[#fff7ed]">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncreaseItem(item.productId)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a2d22] bg-[#120f0b] text-lg font-semibold text-[#fff7ed] transition hover:bg-[#2b231a]"
                  >
                    +
                  </button>
                </div>

                <p className="text-base font-semibold text-amber-300">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-[#3a2d22] px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[#c8b8a3]">
            <span>Total</span>
            <span className="text-2xl font-semibold text-[#fff7ed]">
              {formatCurrency(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onGenerateOrder}
            disabled={items.length === 0}
            className="w-full rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#3a2d22] disabled:text-[#9f8f7a]"
          >
            Generar pedido
          </button>
        </div>
      </aside>
    </>
  );
}
