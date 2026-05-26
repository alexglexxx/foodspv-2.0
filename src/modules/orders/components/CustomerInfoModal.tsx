"use client";

import { useState, type FormEvent } from "react";

import type { CustomerInfo } from "../types/order";

interface CustomerInfoModalProps {
  isOpen: boolean;
  total: number;
  isSubmitting: boolean;
  successMessage: string | null;
  successOrderId: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (customerInfo: CustomerInfo) => void | Promise<void>;
}

type CustomerInfoErrors = Partial<Record<keyof CustomerInfo, string>>;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function validateCustomerInfo(customerInfo: CustomerInfo): CustomerInfoErrors {
  const errors: CustomerInfoErrors = {};
  const nombre = customerInfo.nombre.trim();
  const telefono = customerInfo.telefono.trim();
  const phoneDigits = telefono.replace(/\D/g, "");

  if (nombre.length === 0) {
    errors.nombre = "El nombre es obligatorio.";
  } else if (nombre.length < 4) {
    errors.nombre = "El nombre debe tener al menos 4 caracteres.";
  }

  if (telefono.length === 0) {
    errors.telefono = "El teléfono es obligatorio.";
  } else if (phoneDigits.length < 10) {
    errors.telefono = "El teléfono debe tener al menos 10 dígitos.";
  }

  return errors;
}

export function CustomerInfoModal({
  isOpen,
  total,
  isSubmitting,
  successMessage,
  successOrderId,
  errorMessage,
  onClose,
  onSubmit,
}: CustomerInfoModalProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    nombre: "",
    telefono: "",
  });
  const [errors, setErrors] = useState<CustomerInfoErrors>({});

  function updateField(field: keyof CustomerInfo, value: string): void {
    setCustomerInfo((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedCustomerInfo: CustomerInfo = {
      nombre: customerInfo.nombre.trim(),
      telefono: customerInfo.telefono.trim().replace(/\D/g, ""),
    };

    const validationErrors = validateCustomerInfo(normalizedCustomerInfo);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    void onSubmit(normalizedCustomerInfo);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Cerrar formulario de cliente"
        onClick={onClose}
        disabled={isSubmitting}
        className="absolute inset-0 bg-stone-950/60"
      />

      <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Generar pedido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Datos del cliente
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Completa nombre y teléfono para enviar el pedido a la API real.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 rounded-3xl bg-stone-950 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
            Total actual
          </p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(total)}</p>
        </div>

        {successMessage ? (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            <p className="font-semibold">Pedido generado correctamente.</p>
            <p className="mt-2 leading-6">{successMessage}</p>
            {successOrderId ? (
              <p className="mt-2 font-medium">Folio: {successOrderId}</p>
            ) : null}
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-stone-800">Nombre</span>
              <input
                type="text"
                name="nombre"
                value={customerInfo.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Ej. Ana Pérez"
                autoComplete="name"
              />
              {errors.nombre ? (
                <span className="mt-2 block text-sm text-rose-600">
                  {errors.nombre}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-stone-800">
                Teléfono
              </span>
              <input
                type="tel"
                name="telefono"
                value={customerInfo.telefono}
                onChange={(event) => updateField("telefono", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Ej. (55) 1234-5678"
                autoComplete="tel"
              />
              {errors.telefono ? (
                <span className="mt-2 block text-sm text-rose-600">
                  {errors.telefono}
                </span>
              ) : null}
            </label>

            {errorMessage ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? "Generando pedido..." : "Confirmar y enviar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
