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
          className="fixed inset-0 z-30 touch-manipulation bg-[#2b2118]/70 transition-all duration-150 active:bg-[#2b2118]/80"
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-[#6b5138] bg-[#3a2b1f] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-[#6b5138] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">
              Pedido en curso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#fff7ed]">
              Carrito
            </h2>
          </div>
          <AppButton
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="!border-[#6b5138] !bg-[#463426] text-[#fff7ed] hover:!bg-[#5a422e] active:!bg-[#3a2b1f] focus-visible:ring-offset-[#3a2b1f]"
          >
            Cerrar
          </AppButton>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#6b5138] bg-[#463426] p-6 text-sm leading-6 text-[#e7d4b8]">
              Tu carrito está vacío. Agrega productos del menú para recalcular el total.
            </div>
          ) : null}

          {items.map((item) => (
            <article
              key={item.productId}
              className="rounded-3xl border border-[#6b5138] bg-[#463426] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[#fff7ed]">
                    {item.productName}
                  </h3>
                  <p className="mt-1 text-sm text-[#e7d4b8]">
                    {formatCurrency(item.unitPrice)} c/u
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-[#e7d4b8]">
                      {item.notes}
                    </p>
                  ) : null}
                </div>

                <AppButton
                  onClick={() => onRemoveItem(item.productId)}
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] text-rose-300 hover:!bg-rose-500/10 hover:text-rose-200 active:!bg-rose-500/20 focus-visible:ring-offset-[#463426]"
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
                    className="h-11 w-11 !border-[#6b5138] !bg-[#2b2118] px-0 text-lg text-[#fff7ed] hover:!bg-[#3a2b1f] active:!bg-[#463426] focus-visible:ring-offset-[#463426]"
                    aria-label={`Quitar una unidad de ${item.productName}`}
                  >
                    -
                  </AppButton>
                  <span className="min-w-6 text-center text-sm font-semibold text-[#fff7ed]">
                    {item.quantity}
                  </span>
                  <AppButton
                    onClick={() => onIncreaseItem(item.productId)}
                    variant="secondary"
                    size="sm"
                    className="h-11 w-11 !border-[#6b5138] !bg-[#2b2118] px-0 text-lg text-[#fff7ed] hover:!bg-[#3a2b1f] active:!bg-[#463426] focus-visible:ring-offset-[#463426]"
                    aria-label={`Agregar una unidad de ${item.productName}`}
                  >
                    +
                  </AppButton>
                </div>

                <p className="text-base font-semibold text-amber-300">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="border-t border-[#6b5138] px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[#e7d4b8]">
            <span>Total</span>
            <span className="text-2xl font-semibold text-[#fff7ed]">
              {formatCurrency(total)}
            </span>
          </div>
          <AppButton
            onClick={onGenerateOrder}
            disabled={items.length === 0}
            className="w-full !border-orange-600 !bg-orange-600 px-5 py-3 text-sm text-[#fff7ed] hover:!bg-orange-500 active:!bg-orange-700 focus-visible:ring-offset-[#3a2b1f] disabled:!bg-[#463426] disabled:text-[#b99f80]"
          >
            Generar pedido
          </AppButton>
        </div>
      </aside>
    </>
  );
}
