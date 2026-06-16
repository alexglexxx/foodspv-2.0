"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductImage } from "@/types/product.types";

interface ProductLightboxProps {
  images: ProductImage[];
  initialIndex?: number;
  onClose: () => void;
}

export function ProductLightbox({
  images,
  initialIndex = 0,
  onClose,
}: ProductLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, onClose, prev]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Cerrar galería"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        ✕
      </button>

      {images.length > 1 && (
        <button
          type="button"
          aria-label="Imagen anterior"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-4 z-[101] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          ←
        </button>
      )}

      {images.length > 1 && (
        <button
          type="button"
          aria-label="Imagen siguiente"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-4 z-[101] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          →
        </button>
      )}

      <div
        className="relative max-h-full max-w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || "Product image"}
          className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl"
        />

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
            {images[currentIndex].label && (
              <span>{images[currentIndex].label} • </span>
            )}
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>
    </div>
  );
}
