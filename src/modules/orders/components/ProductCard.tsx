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
      className={`flex w-[220px] gap-3 rounded-2xl bg-[#35271b] p-3 shadow-sm ring-1 ring-[#5a402b] ${className}`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#2a1f16] sm:h-24 sm:w-24">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
            <span className="text-2xl" aria-hidden="true">
              🍽️
            </span>
            {product.category ? (
              <span className="mt-1 line-clamp-1 text-[10px] font-bold text-[#d8c7ad]">
                {product.category}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-black leading-tight text-[#fff7ed]">
            {product.name}
          </h2>
          <span className="mt-1 inline-flex rounded-full bg-orange-500/15 px-2 py-1 text-[11px] font-bold text-orange-300">
            {formatCurrency(product.price)}
          </span>

          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#d8c7ad]">
            {product.description ?? "Producto disponible."}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-h-4 text-[11px] font-medium text-[#bda88c]">
            {quantityInCart > 0 ? `${quantityInCart} en carrito` : ""}
          </div>

          <button
            type="button"
            onClick={() => onAddProduct(product)}
            disabled={!product.available}
            className="shrink-0 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#5a402b] disabled:text-[#bda88c]"
          >
            {product.available ? "Agregar" : "No disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}
