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
      className={`flex w-[220px] gap-3 rounded-2xl bg-[var(--tenant-secondary)] p-3 shadow-sm ring-1 ring-[var(--tenant-ring)] ${className}`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--tenant-surface)] sm:h-24 sm:w-24">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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
              <span className="mt-1 line-clamp-1 text-[10px] font-bold text-[var(--tenant-muted)]">
                {product.category}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-black leading-tight text-[var(--tenant-text)]">
            {product.name}
          </h2>
          <span className="mt-1 inline-flex rounded-full bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)] px-2 py-1 text-[11px] font-bold text-[var(--tenant-accent)]">
            {formatCurrency(product.price)}
          </span>

          <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--tenant-muted)]">
            {product.description ?? "Producto disponible."}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-h-4 text-[11px] font-medium text-[var(--tenant-muted)]">
            {quantityInCart > 0 ? `${quantityInCart} en carrito` : ""}
          </div>

          <button
            type="button"
            onClick={() => onAddProduct(product)}
            disabled={!product.available}
            className="shrink-0 rounded-full bg-[var(--tenant-primary)] px-3 py-1.5 text-xs font-bold text-white transition brightness-100 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--tenant-ring)] disabled:text-[var(--tenant-muted)]"
          >
            {product.available ? "Agregar" : "No disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}
