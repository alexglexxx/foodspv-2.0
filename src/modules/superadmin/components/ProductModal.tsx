"use client";

import { type FormEvent } from "react";

import { AppButton } from "@/components/ui/AppButton";

import type { SuperAdminProductInput } from "../types/superAdmin";
import { ProductForm } from "./ProductForm";

interface ProductModalProps {
  form: SuperAdminProductInput;
  isEditing: boolean;
  isSaving: boolean;
  onChange: (form: SuperAdminProductInput) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ProductModal({
  form,
  isEditing,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: ProductModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 px-4 py-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onMouseDown={() => {
        if (!isSaving) {
          onCancel();
        }
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-700">
              Productos
            </p>
            <h2
              id="product-modal-title"
              className="mt-1 text-xl font-black text-stone-950"
            >
              {isEditing ? "Editar producto" : "Crear producto"}
            </h2>
          </div>
          <AppButton
            onClick={onCancel}
            variant="secondary"
            size="sm"
            disabled={isSaving}
            className="h-10 w-10 min-h-10 px-0 text-xl text-stone-700"
            aria-label="Cerrar modal"
          >
            x
          </AppButton>
        </div>

        <div className="p-5">
          <ProductForm
            form={form}
            isEditing={isEditing}
            isSaving={isSaving}
            onChange={onChange}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}
