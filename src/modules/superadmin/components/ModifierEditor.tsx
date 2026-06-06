"use client";

import { AppButton } from "@/components/ui/AppButton";
import type {
  ProductOption,
  ProductOptionValue,
} from "@/types/product.types";

interface ModifierEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
}

function createOptionId(): string {
  return `opt_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createValueId(): string {
  return `val_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function ModifierEditor({ options, onChange }: ModifierEditorProps) {
  function updateOption(id: string, updates: Partial<ProductOption>): void {
    onChange(
      options.map((option) =>
        option.id === id ? { ...option, ...updates } : option
      )
    );
  }

  function addOption(): void {
    onChange([
      ...options,
      {
        id: createOptionId(),
        name: "",
        type: "single",
        required: false,
        values: [],
      },
    ]);
  }

  function removeOption(id: string): void {
    onChange(options.filter((option) => option.id !== id));
  }

  function addValue(optionId: string): void {
    onChange(
      options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: [
                ...option.values,
                {
                  id: createValueId(),
                  label: "",
                  priceDelta: 0,
                  active: true,
                },
              ],
            }
          : option
      )
    );
  }

  function updateValue(
    optionId: string,
    valueId: string,
    updates: Partial<ProductOptionValue>
  ): void {
    onChange(
      options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((value) =>
                value.id === valueId ? { ...value, ...updates } : value
              ),
            }
          : option
      )
    );
  }

  function removeValue(optionId: string, valueId: string): void {
    onChange(
      options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.filter((value) => value.id !== valueId),
            }
          : option
      )
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Opciones / Modificadores</h3>
          <p className="mt-1 text-sm font-semibold text-stone-500">
            Configura sabores, salsas, extras o selecciones obligatorias.
          </p>
        </div>
        <AppButton onClick={addOption} variant="secondary" size="sm">
          + Agregar opción
        </AppButton>
      </div>

      {options.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm font-semibold text-stone-500">
          Sin opciones configuradas.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {options.map((option) => (
          <div
            key={option.id}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)]">
              <label className="block">
                <span className="text-sm font-extrabold text-stone-900">
                  Nombre de opción
                </span>
                <input
                  type="text"
                  value={option.name}
                  onChange={(event) =>
                    updateOption(option.id, { name: event.target.value })
                  }
                  minLength={2}
                  maxLength={60}
                  required
                  placeholder="Ej. Elige sabor"
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-stone-900">
                  Tipo
                </span>
                <select
                  value={option.type}
                  onChange={(event) =>
                    updateOption(option.id, {
                      type: event.target.value as ProductOption["type"],
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="single">Selección única</option>
                  <option value="multiple">Selección múltiple</option>
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={option.required}
                  onChange={(event) =>
                    updateOption(option.id, { required: event.target.checked })
                  }
                  className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-extrabold text-stone-900">
                  Obligatoria
                </span>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-stone-900">Valores</p>
              <AppButton
                onClick={() => addValue(option.id)}
                variant="secondary"
                size="sm"
              >
                + Agregar valor
              </AppButton>
            </div>

            {option.values.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3 text-sm font-semibold text-stone-500">
                Agrega al menos un valor activo para que la opción aparezca.
              </p>
            ) : null}

            <div className="mt-3 space-y-3">
              {option.values.map((value) => (
                <div
                  key={value.id}
                  className="grid gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)_auto_auto]"
                >
                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-stone-500">
                      Valor
                    </span>
                    <input
                      type="text"
                      value={value.label}
                      onChange={(event) =>
                        updateValue(option.id, value.id, {
                          label: event.target.value,
                        })
                      }
                      minLength={1}
                      maxLength={60}
                      required
                      placeholder="Ej. Sprite"
                      className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-stone-500">
                      Precio extra
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(value.priceDelta ?? 0)}
                      onChange={(event) =>
                        updateValue(option.id, value.id, {
                          priceDelta: Number.parseFloat(event.target.value) || 0,
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>

                  <label className="flex items-center gap-3 self-end rounded-2xl border border-stone-200 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      checked={value.active}
                      onChange={(event) =>
                        updateValue(option.id, value.id, {
                          active: event.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-extrabold text-stone-900">
                      Activo
                    </span>
                  </label>

                  <AppButton
                    onClick={() => removeValue(option.id, value.id)}
                    variant="danger"
                    size="sm"
                    className="self-end"
                  >
                    Quitar
                  </AppButton>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <AppButton
                onClick={() => removeOption(option.id)}
                variant="danger"
                size="sm"
              >
                Quitar opción
              </AppButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
