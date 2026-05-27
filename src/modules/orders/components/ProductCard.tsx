"use client";

import type { Product } from "@/types/product.types";

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddProduct: (product: Product) => void;
  className?: string;
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
  className = "",
}: ProductCardProps) {
  return (
    <article
      className={`flex w-[220px] flex-col rounded-2xl bg-[#241d16] p-3 shadow-sm ring-1 ring-[#3a2d22] ${className}`}
    >
      <div className="h-24 w-full overflow-hidden rounded-xl bg-[#120f0b]">
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

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-base font-black leading-tight text-[#fff7ed]">
            {product.name}
          </h2>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300">
            {formatCurrency(product.price)}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#c8b8a3]">
          {product.description ?? "Producto disponible."}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-h-4 text-xs font-medium text-[#9f8f7a]">
            {quantityInCart > 0 ? `${quantityInCart} en carrito` : ""}
          </div>

          <button
            type="button"
            onClick={() => onAddProduct(product)}
            disabled={!product.available}
            className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#3a2d22] disabled:text-[#9f8f7a]"
          >
            {product.available ? "Agregar" : "No disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}
