"use client";

import type {
  SuperAdminProductModifier,
  SuperAdminProductPricingMode,
} from "../types/superAdmin";

interface ModifierEditorProps {
  modifiers: SuperAdminProductModifier[];
  onChange: (modifiers: SuperAdminProductModifier[]) => void;
}

const PRICING_MODE_OPTIONS: Array<{
  value: SuperAdminProductPricingMode;
  label: string;
  helpText: string;
}> = [
  {
    value: "included",
    label: "Incluido",
    helpText: "Incluido sin costo, como salsa o cilantro.",
  },
  {
    value: "additive",
    label: "Extra con costo",
    helpText: "Suma al precio, como extra tocino.",
  },
  {
    value: "tier_upgrade",
    label: "Especial / upgrade",
    helpText: "Sube el precio final del producto, como crepa premium.",
  },
];

function createModifierId(): string {
  return `mod_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getPricingHelpText(pricingMode: SuperAdminProductPricingMode): string {
  return (
    PRICING_MODE_OPTIONS.find((option) => option.value === pricingMode)
      ?.helpText ?? PRICING_MODE_OPTIONS[0].helpText
  );
}

export function ModifierEditor({ modifiers, onChange }: ModifierEditorProps) {
  function updateModifier(
    id: string,
    updates: Partial<SuperAdminProductModifier>
  ): void {
    onChange(
      modifiers.map((modifier) =>
        modifier.id === id ? { ...modifier, ...updates } : modifier
      )
    );
  }

  function addModifier(): void {
    onChange([
      ...modifiers,
      {
        id: createModifierId(),
        name: "",
        pricingMode: "included",
        priceDelta: 0,
        active: true,
      },
    ]);
  }

  function removeModifier(id: string): void {
    onChange(modifiers.filter((modifier) => modifier.id !== id));
  }

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black">Modificadores</h3>
        <button
          type="button"
          onClick={addModifier}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100"
        >
          + Agregar modificador
        </button>
      </div>

      {modifiers.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm font-semibold text-stone-500">
          Sin modificadores configurados.
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {modifiers.map((modifier) => (
          <div
            key={modifier.id}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
              <label className="block">
                <span className="text-sm font-extrabold text-stone-900">
                  Nombre
                </span>
                <input
                  type="text"
                  value={modifier.name}
                  onChange={(event) =>
                    updateModifier(modifier.id, { name: event.target.value })
                  }
                  minLength={2}
                  maxLength={60}
                  required
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-stone-900">
                  Tipo
                </span>
                <select
                  value={modifier.pricingMode}
                  onChange={(event) =>
                    updateModifier(modifier.id, {
                      pricingMode: event.target
                        .value as SuperAdminProductPricingMode,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                >
                  {PRICING_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-stone-900">
                  Precio extra
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={String(modifier.priceDelta)}
                  onChange={(event) =>
                    updateModifier(modifier.id, {
                      priceDelta: Number.parseFloat(event.target.value) || 0,
                    })
                  }
                  required
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>
            </div>

            <p className="mt-3 text-xs font-semibold leading-5 text-stone-500">
              {getPricingHelpText(modifier.pricingMode)}
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={modifier.active}
                  onChange={(event) =>
                    updateModifier(modifier.id, { active: event.target.checked })
                  }
                  className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-extrabold text-stone-900">
                  Activo
                </span>
              </label>

              <button
                type="button"
                onClick={() => removeModifier(modifier.id)}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
