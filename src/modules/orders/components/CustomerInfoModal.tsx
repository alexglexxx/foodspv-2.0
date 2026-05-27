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
    errors.nombre = "Escribe tu nombre para confirmar el pedido.";
  } else if (nombre.length < 4) {
    errors.nombre = "El nombre debe tener al menos 4 caracteres.";
  }

  if (telefono.length === 0) {
    errors.telefono = "Escribe tu teléfono para que el negocio pueda contactarte.";
  } else if (phoneDigits.length < 10) {
    errors.telefono = "El teléfono debe tener al menos 10 dígitos.";
  }

  return errors;
}

function getCustomerFriendlyStatus(_message: string): {
  title: string;
  body: string;
  tone: "success";
} {
  return {
    title: "Pedido realizado con éxito",
    body: "Puedes pasar por tu pedido en 15 a 20 minutos.",
    tone: "success",
  };
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

  const customerStatus = successMessage
    ? getCustomerFriendlyStatus(successMessage)
    : null;

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
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center sm:py-6">
      <button
        type="button"
        aria-label="Cerrar datos del cliente"
        onClick={onClose}
        disabled={isSubmitting}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-[2px]"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#1c1712] p-6 shadow-2xl ring-1 ring-[#3a2d22] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-orange-300">
              Confirmar pedido
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#fff7ed]">
              Datos del cliente
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[#c8b8a3]">
              Ingresa tu nombre y teléfono para que el negocio pueda confirmar tu orden.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 rounded-full border border-[#3a2d22] bg-[#241d16] px-4 py-2 text-sm font-extrabold text-[#fff7ed] shadow-sm transition hover:bg-[#2b231a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#3a2d22] bg-[#241d16] p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-300">
            Total del pedido
          </p>

          <p className="mt-2 text-4xl font-black tracking-tight text-[#fff7ed]">
            {formatCurrency(total)}
          </p>
        </div>

        {customerStatus ? (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/15 p-5 text-sm text-emerald-300">
            <p className="text-lg font-black">
              ✅
              {customerStatus.title}
            </p>

            <p className="mt-2 font-medium leading-6">{customerStatus.body}</p>

            {successOrderId ? (
              <div className="mt-4 rounded-2xl bg-[#120f0b] px-4 py-3 ring-1 ring-[#3a2d22]">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-70">
                  Folio
                </p>
                <p className="mt-1 break-all text-base font-black">
                  {successOrderId}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-orange-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-500"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-extrabold text-[#fff7ed]">
                Nombre
              </span>

              <input
                type="text"
                name="nombre"
                value={customerInfo.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#3a2d22] bg-[#120f0b] px-4 py-4 text-base font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#9f8f7a] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
                placeholder="Ej. Ana Pérez"
                autoComplete="name"
              />

              {errors.nombre ? (
                <span className="mt-2 block text-sm font-semibold text-rose-300">
                  {errors.nombre}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-extrabold text-[#fff7ed]">
                Teléfono
              </span>

              <input
                type="tel"
                name="telefono"
                value={customerInfo.telefono}
                onChange={(event) => updateField("telefono", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#3a2d22] bg-[#120f0b] px-4 py-4 text-base font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#9f8f7a] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
                placeholder="Ej. 3221234567"
                autoComplete="tel"
                inputMode="tel"
              />

              {errors.telefono ? (
                <span className="mt-2 block text-sm font-semibold text-rose-300">
                  {errors.telefono}
                </span>
              ) : null}
            </label>

            {errorMessage ? (
              <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/15 p-4 text-sm font-semibold leading-6 text-rose-300">
                No pudimos confirmar el pedido. Intenta de nuevo en unos segundos.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-orange-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-[#3a2d22] disabled:text-[#9f8f7a]"
            >
              {isSubmitting ? "Confirmando pedido..." : "Confirmar pedido"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
