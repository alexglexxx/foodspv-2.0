"use client";

import { type FormEvent } from "react";

import type { SuperAdminProductInput } from "../types/superAdmin";
import { ModifierEditor } from "./ModifierEditor";

interface ProductFormProps {
  form: SuperAdminProductInput;
  isEditing: boolean;
  isSaving: boolean;
  onChange: (form: SuperAdminProductInput) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

type ProductTextField = "name" | "description" | "category" | "imageUrl";

export function ProductForm({
  form,
  isEditing,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  function updateTextField(field: ProductTextField, value: string): void {
    onChange({
      ...form,
      [field]: value,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.5rem] border border-stone-200 bg-white p-5"
    >
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </p>
        <h3 className="mt-2 text-xl font-black">
          {isEditing ? form.name || "Producto" : "Alta de producto"}
        </h3>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(value) => updateTextField("name", value)}
            required
          />
          <TextField
            label="Categoría"
            value={form.category}
            onChange={(value) => updateTextField("category", value)}
            required
          />
        </div>

        <TextField
          label="Descripción"
          value={form.description}
          onChange={(value) => updateTextField("description", value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Precio"
            type="number"
            value={String(form.price)}
            onChange={(value) =>
              onChange({ ...form, price: Number.parseFloat(value) || 0 })
            }
            required
          />
          <TextField
            label="Imagen URL"
            value={form.imageUrl}
            onChange={(value) => updateTextField("imageUrl", value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                onChange({ ...form, active: event.target.checked })
              }
              className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-extrabold text-stone-900">
              Activo
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                onChange({ ...form, available: event.target.checked })
              }
              className="h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-extrabold text-stone-900">
              Disponible
            </span>
          </label>
        </div>

        <ModifierEditor
          modifiers={form.modifiers ?? []}
          onChange={(modifiers) => onChange({ ...form, modifiers })}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar producto"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-stone-900">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}
