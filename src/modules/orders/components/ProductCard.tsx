"use client";

import type { Product } from "@/types/product.types";

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddProduct: (product: Product) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProductCard({
  product,
  quantityInCart,
  onAddProduct,
}: ProductCardProps) {
  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              {product.category ?? "Especialidad"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              {product.name}
            </h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            {formatCurrency(product.price)}
          </span>
        </div>

        <p className="min-h-12 text-sm leading-6 text-stone-600">
          {product.description ?? "Producto disponible para ordenar ahora."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm text-stone-500">
          {quantityInCart > 0 ? `${quantityInCart} en carrito` : "Listo para agregar"}
        </div>

        <button
          type="button"
          onClick={() => onAddProduct(product)}
          disabled={!product.available}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {product.available ? "Agregar" : "No disponible"}
        </button>
      </div>
    </article>
  );
}
