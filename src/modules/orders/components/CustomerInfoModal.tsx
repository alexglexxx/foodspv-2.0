"use client";

import { useState, type FormEvent } from "react";

import { AppButton } from "@/components/ui/AppButton";

import type { CustomerInfo } from "../types/order";

interface CustomerInfoModalProps {
  isOpen: boolean;
  total: number;
  deliveryEnabled: boolean;
  deliveryType: "pickup" | "delivery";
  deliveryFee: number;
  deliveryAddress: string;
  isSubmitting: boolean;
  successMessage: string | null;
  successOrderId: string | null;
  errorMessage: string | null;
  onDeliveryTypeChange: (deliveryType: "pickup" | "delivery") => void;
  onDeliveryAddressChange: (deliveryAddress: string) => void;
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

function getCustomerFriendlyStatus(deliveryType: "pickup" | "delivery"): {
  title: string;
  body: string;
  tone: "success";
} {
  return {
    title: "Pedido realizado con éxito",
    body:
      deliveryType === "delivery"
        ? "Tu pedido será enviado a la dirección indicada."
        : "Puedes pasar por tu pedido en 15 a 20 minutos.",
    tone: "success",
  };
}

export function CustomerInfoModal({
  isOpen,
  total,
  deliveryEnabled,
  deliveryType,
  deliveryFee,
  deliveryAddress,
  isSubmitting,
  successMessage,
  successOrderId,
  errorMessage,
  onDeliveryTypeChange,
  onDeliveryAddressChange,
  onClose,
  onSubmit,
}: CustomerInfoModalProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    nombre: "",
    telefono: "",
  });
  const [errors, setErrors] = useState<CustomerInfoErrors>({});
  const [deliveryAddressError, setDeliveryAddressError] = useState<string | null>(
    null
  );

  const customerStatus = successMessage
    ? getCustomerFriendlyStatus(deliveryType)
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

  function updateDeliveryType(nextDeliveryType: "pickup" | "delivery"): void {
    onDeliveryTypeChange(nextDeliveryType);

    if (nextDeliveryType === "pickup") {
      setDeliveryAddressError(null);
    }
  }

  function updateDeliveryAddress(value: string): void {
    onDeliveryAddressChange(value);

    if (deliveryAddressError) {
      setDeliveryAddressError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedCustomerInfo: CustomerInfo = {
      nombre: customerInfo.nombre.trim(),
      telefono: customerInfo.telefono.trim().replace(/\D/g, ""),
    };

    const validationErrors = validateCustomerInfo(normalizedCustomerInfo);
    const normalizedDeliveryAddress = deliveryAddress.trim();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (deliveryType === "delivery" && normalizedDeliveryAddress.length === 0) {
      setDeliveryAddressError(
        "Agrega la dirección para poder enviar tu pedido a domicilio."
      );
      return;
    }

    if (deliveryType === "delivery") {
      onDeliveryAddressChange(normalizedDeliveryAddress);
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
        className="absolute inset-0 touch-manipulation bg-[#2b2118]/70 backdrop-blur-[2px] transition-all duration-150 active:bg-[#2b2118]/80"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#3a2b1f] p-6 shadow-2xl ring-1 ring-[#6b5138] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-orange-400">
              Confirmar pedido
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#fff7ed]">
              Datos del cliente
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[#e7d4b8]">
              Ingresa tu nombre y teléfono para que el negocio pueda confirmar tu orden.
            </p>
          </div>

          <AppButton
            onClick={onClose}
            disabled={isSubmitting}
            variant="secondary"
            size="sm"
            className="shrink-0 !border-[#6b5138] !bg-[#463426] text-[#fff7ed] hover:!bg-[#5a422e] active:!bg-[#3a2b1f] focus-visible:ring-offset-[#3a2b1f]"
          >
            Cerrar
          </AppButton>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[#6b5138] bg-[#463426] p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-400">
            Total del pedido
          </p>

          <p className="mt-2 text-4xl font-black tracking-tight text-[#fff7ed]">
            {formatCurrency(total)}
          </p>

          {deliveryType === "delivery" ? (
            <p className="mt-2 text-sm font-semibold text-[#e7d4b8]">
              Incluye envío: {formatCurrency(deliveryFee)}
            </p>
          ) : null}
        </div>

        {customerStatus ? (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/15 p-5 text-sm text-emerald-300">
            <p className="text-lg font-black">
              ✅
              {customerStatus.title}
            </p>

            <p className="mt-2 font-medium leading-6">{customerStatus.body}</p>

            {successOrderId ? (
              <div className="mt-4 rounded-2xl bg-[#2b2118] px-4 py-3 ring-1 ring-[#6b5138]">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-70">
                  Folio
                </p>
                <p className="mt-1 break-all text-base font-black">
                  {successOrderId}
                </p>
              </div>
            ) : null}

            <AppButton
              onClick={onClose}
              className="mt-5 w-full !border-orange-600 !bg-orange-600 px-5 py-3 text-sm text-[#fff7ed] hover:!bg-orange-500 active:!bg-orange-700 focus-visible:ring-offset-[#3a2b1f]"
            >
              Entendido
            </AppButton>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {deliveryEnabled ? (
              <section className="rounded-[1.5rem] border border-[#6b5138] bg-[#463426] p-4">
                <p className="text-sm font-extrabold text-[#fff7ed]">
                  Tipo de entrega
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateDeliveryType("pickup")}
                    className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-extrabold transition ${
                      deliveryType === "pickup"
                        ? "border-orange-500 bg-orange-600 text-[#fff7ed]"
                        : "border-[#6b5138] bg-[#2b2118] text-[#e7d4b8] hover:bg-[#3a2b1f]"
                    }`}
                  >
                    Recoger pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDeliveryType("delivery")}
                    className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-extrabold transition ${
                      deliveryType === "delivery"
                        ? "border-orange-500 bg-orange-600 text-[#fff7ed]"
                        : "border-[#6b5138] bg-[#2b2118] text-[#e7d4b8] hover:bg-[#3a2b1f]"
                    }`}
                  >
                    Entrega a domicilio
                  </button>
                </div>

                {deliveryType === "delivery" ? (
                  <label className="mt-4 block">
                    <span className="text-sm font-extrabold text-[#fff7ed]">
                      Dirección de entrega
                    </span>
                    <textarea
                      name="deliveryAddress"
                      value={deliveryAddress}
                      onChange={(event) =>
                        updateDeliveryAddress(event.target.value)
                      }
                      className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#6b5138] bg-[#2b2118] px-4 py-4 text-base font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#b99f80] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                      placeholder="Calle, número, colonia y referencias"
                      autoComplete="street-address"
                    />
                    {deliveryAddressError ? (
                      <span className="mt-2 block text-sm font-semibold text-rose-300">
                        {deliveryAddressError}
                      </span>
                    ) : null}
                  </label>
                ) : (
                  <p className="mt-4 rounded-2xl bg-[#2b2118] px-4 py-3 text-sm font-semibold text-[#e7d4b8] ring-1 ring-[#6b5138]">
                    Puedes pasar por tu pedido cuando esté listo.
                  </p>
                )}
              </section>
            ) : (
              <p className="rounded-[1.5rem] border border-[#6b5138] bg-[#463426] p-4 text-sm font-semibold text-[#e7d4b8]">
                Puedes pasar por tu pedido cuando esté listo.
              </p>
            )}

            <label className="block">
              <span className="text-sm font-extrabold text-[#fff7ed]">
                Nombre
              </span>

              <input
                type="text"
                name="nombre"
                value={customerInfo.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#6b5138] bg-[#2b2118] px-4 py-4 text-base font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#b99f80] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
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
                className="mt-2 w-full rounded-2xl border border-[#6b5138] bg-[#2b2118] px-4 py-4 text-base font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#b99f80] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
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

            <AppButton
              type="submit"
              loading={isSubmitting}
              loadingText="Enviando..."
              className="w-full !border-orange-600 !bg-orange-600 px-5 py-4 text-base text-[#fff7ed] shadow-lg shadow-[#2b2118]/25 hover:!bg-orange-500 active:!bg-orange-700 focus-visible:ring-offset-[#3a2b1f] disabled:!bg-[#6b5138] disabled:text-[#b99f80]"
            >
              Confirmar pedido
            </AppButton>
          </form>
        )}
      </div>
    </div>
  );
}
