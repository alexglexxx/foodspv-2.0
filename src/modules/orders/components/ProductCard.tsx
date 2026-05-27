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
    <article className="grid h-full grid-cols-[88px_1fr] gap-3 rounded-[1.25rem] border border-stone-200 bg-white p-3 shadow-sm">
      <div className="h-[88px] w-[88px] overflow-hidden rounded-2xl bg-amber-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            <span aria-hidden="true">🍽️</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 text-base font-bold leading-tight text-stone-900">
              {product.name}
            </h2>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            {formatCurrency(product.price)}
          </span>
          </div>

          <p className="line-clamp-2 text-sm leading-5 text-stone-600">
            {product.description ?? "Producto disponible para ordenar ahora."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-stone-500">
          {quantityInCart > 0 ? `${quantityInCart} en carrito` : "Listo para agregar"}
        </div>

          <button
            type="button"
            onClick={() => onAddProduct(product)}
            disabled={!product.available}
            className="shrink-0 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {product.available ? "Agregar" : "No disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}
