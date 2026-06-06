"use client";

import { useMemo, useState } from "react";

import { AppButton } from "@/components/ui/AppButton";
import type {
  Product,
  ProductOption,
  SelectedProductOption,
} from "@/types/product.types";

interface ProductOptionsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedOptions: SelectedProductOption[]
  ) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function getActiveOptions(product: Product): ProductOption[] {
  return (product.options ?? [])
    .map((option) => ({
      ...option,
      values: option.values.filter((value) => value.active),
    }))
    .filter((option) => option.values.length > 0);
}

function buildSelectedOptions(
  options: ProductOption[],
  selections: Record<string, string[]>
): SelectedProductOption[] {
  return options.flatMap((option): SelectedProductOption[] => {
    const valueIds = selections[option.id] ?? [];
    const selectedValues = option.values.filter((value) =>
      valueIds.includes(value.id)
    );

    if (selectedValues.length === 0) {
      return [];
    }

    return [
      {
        optionId: option.id,
        optionName: option.name,
        valueIds: selectedValues.map((value) => value.id),
        valueLabels: selectedValues.map((value) => value.label),
        priceDeltaTotal: selectedValues.reduce(
          (sum, value) => sum + (value.priceDelta ?? 0),
          0
        ),
      },
    ];
  });
}

export function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductOptionsModalProps) {
  const activeOptions = useMemo(() => getActiveOptions(product), [product]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const selectedOptions = useMemo(
    () => buildSelectedOptions(activeOptions, selections),
    [activeOptions, selections]
  );
  const priceDeltaTotal = selectedOptions.reduce(
    (sum, option) => sum + option.priceDeltaTotal,
    0
  );
  const finalPrice = product.price + priceDeltaTotal;
  const canAdd = activeOptions.every((option) => {
    if (!option.required) {
      return true;
    }

    return (selections[option.id] ?? []).length > 0;
  });

  function setSingleSelection(optionId: string, valueId: string): void {
    setSelections((current) => ({
      ...current,
      [optionId]: [valueId],
    }));
  }

  function toggleMultipleSelection(optionId: string, valueId: string): void {
    setSelections((current) => {
      const currentValueIds = current[optionId] ?? [];
      const nextValueIds = currentValueIds.includes(valueId)
        ? currentValueIds.filter((currentValueId) => currentValueId !== valueId)
        : [...currentValueIds, valueId];

      return {
        ...current,
        [optionId]: nextValueIds,
      };
    });
  }

  function handleAddToCart(): void {
    if (!canAdd) {
      return;
    }

    onAddToCart(product, selectedOptions);
    setSelections({});
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar personalización"
        onClick={onClose}
        className="fixed inset-0 z-[60] touch-manipulation bg-black/60"
      />

      <section className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-h-[86vh] max-w-lg overflow-hidden rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-surface)] text-[var(--tenant-text)] shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="border-b border-[var(--tenant-ring)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tenant-accent)]">
            Personaliza
          </p>
          <h2 className="mt-1 text-xl font-black">{product.name}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--tenant-muted)]">
            Base {formatCurrency(product.price)}
          </p>
        </div>

        <div className="max-h-[58vh] space-y-5 overflow-y-auto px-5 py-4">
          {activeOptions.map((option) => (
            <fieldset key={option.id}>
              <legend className="flex w-full items-center justify-between gap-3 text-sm font-black">
                <span>{option.name}</span>
                {option.required ? (
                  <span className="rounded-full bg-[var(--tenant-accent)]/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--tenant-accent)]">
                    Obligatorio
                  </span>
                ) : null}
              </legend>

              <div className="mt-3 space-y-2">
                {option.values.map((value) => {
                  const isSelected = (selections[option.id] ?? []).includes(
                    value.id
                  );

                  return (
                    <label
                      key={value.id}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] px-4 py-3 text-sm font-semibold"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type={option.type === "single" ? "radio" : "checkbox"}
                          name={option.id}
                          checked={isSelected}
                          onChange={() =>
                            option.type === "single"
                              ? setSingleSelection(option.id, value.id)
                              : toggleMultipleSelection(option.id, value.id)
                          }
                          className="h-5 w-5 shrink-0 border-[var(--tenant-ring)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]"
                        />
                        <span className="truncate">{value.label}</span>
                      </span>

                      {value.priceDelta && value.priceDelta > 0 ? (
                        <span className="shrink-0 text-[var(--tenant-accent)]">
                          +{formatCurrency(value.priceDelta)}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="border-t border-[var(--tenant-ring)] px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>Total por unidad</span>
            <span className="text-lg font-black text-[var(--tenant-accent)]">
              {formatCurrency(finalPrice)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AppButton
              onClick={onClose}
              variant="secondary"
              className="!border-[var(--tenant-ring)] !bg-[var(--tenant-subtle)] text-[var(--tenant-text)]"
            >
              Cancelar
            </AppButton>
            <AppButton
              onClick={handleAddToCart}
              disabled={!canAdd}
              className="!border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] text-[var(--tenant-button-text)] hover:!bg-[var(--tenant-primary-hover)]"
            >
              Agregar
            </AppButton>
          </div>
        </div>
      </section>
    </>
  );
}
