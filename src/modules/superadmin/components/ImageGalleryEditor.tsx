"use client";

import { AppButton } from "@/components/ui/AppButton";
import type { ProductImage } from "@/types/product.types";

interface ImageGalleryEditorProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  disabled?: boolean;
}

export function ImageGalleryEditor({
  images,
  onChange,
  disabled,
}: ImageGalleryEditorProps) {
  function addImage() {
    if (images.length >= 5) return;
    onChange([
      ...images,
      {
        id: crypto.randomUUID(),
        url: "",
        alt: "",
        label: "",
        sortOrder: images.length,
        isPrimary: images.length === 0,
      },
    ]);
  }

  function updateImage(id: string, updates: Partial<ProductImage>) {
    onChange(
      images.map((img) => {
        if (img.id !== id) return img;
        return { ...img, ...updates };
      })
    );
  }

  function removeImage(id: string) {
    const nextImages = images.filter((img) => img.id !== id);
    const primaryImageId =
      nextImages.find((img) => img.isPrimary)?.id ?? nextImages[0]?.id;

    onChange(
      nextImages.map((img, i) => ({
        ...img,
        sortOrder: i,
        isPrimary: img.id === primaryImageId,
      }))
    );
  }

  function moveImage(id: string, dir: -1 | 1) {
    const idx = images.findIndex((img) => img.id === id);
    if (idx < 0) return;
    if (dir === -1 && idx === 0) return;
    if (dir === 1 && idx === images.length - 1) return;

    const nextImages = [...images];
    const temp = nextImages[idx];
    nextImages[idx] = nextImages[idx + dir];
    nextImages[idx + dir] = temp;

    onChange(nextImages.map((img, i) => ({ ...img, sortOrder: i })));
  }

  function setPrimary(id: string) {
    onChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-black text-stone-900">Galería de imágenes</h4>
          <p className="mt-1 text-xs font-semibold text-stone-500">
            Agrega hasta 5 imágenes.
          </p>
        </div>
        <AppButton
          type="button"
          onClick={addImage}
          disabled={disabled || images.length >= 5}
          size="sm"
        >
          + Agregar imagen
        </AppButton>
      </div>

      {images.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-start"
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.alt || "Preview"}
                  className="h-20 w-20 flex-shrink-0 rounded-lg object-cover ring-1 ring-stone-200"
                />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-stone-200 ring-1 ring-stone-300">
                  <span className="text-xs font-semibold text-stone-500">Sin URL</span>
                </div>
              )}

              <div className="flex flex-1 flex-col gap-3">
                <input
                  type="url"
                  placeholder="URL de la imagen"
                  value={img.url}
                  onChange={(e) => updateImage(img.id, { url: e.target.value })}
                  disabled={disabled}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-stone-100"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Etiqueta opcional"
                    value={img.label}
                    onChange={(e) => updateImage(img.id, { label: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-stone-100"
                  />
                  <input
                    type="text"
                    placeholder="Texto alternativo"
                    value={img.alt}
                    onChange={(e) => updateImage(img.id, { alt: e.target.value })}
                    disabled={disabled}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-stone-100"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold ring-1 ring-stone-200 hover:bg-stone-50">
                  <input
                    type="radio"
                    name={`primary-image-${img.id}`}
                    checked={img.isPrimary}
                    onChange={() => setPrimary(img.id)}
                    disabled={disabled}
                  />
                  Principal
                </label>
                <div className="flex gap-1">
                  <AppButton
                    type="button"
                    onClick={() => moveImage(img.id, -1)}
                    disabled={disabled || index === 0}
                    variant="secondary"
                    className="flex-1 px-2 py-1 text-xs"
                  >
                    ↑
                  </AppButton>
                  <AppButton
                    type="button"
                    onClick={() => moveImage(img.id, 1)}
                    disabled={disabled || index === images.length - 1}
                    variant="secondary"
                    className="flex-1 px-2 py-1 text-xs"
                  >
                    ↓
                  </AppButton>
                </div>
                <AppButton
                  type="button"
                  onClick={() => removeImage(img.id)}
                  disabled={disabled}
                  variant="danger"
                  className="px-2 py-1 text-xs"
                >
                  Eliminar
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
