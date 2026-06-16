"use client";

import { useState, type FormEvent } from "react";

import { AppButton } from "@/components/ui/AppButton";

import type { CustomerInfo, DeliveryAddressDetails } from "../types/order";

interface CustomerInfoModalProps {
  isOpen: boolean;
  total: number;
  deliveryEnabled: boolean;
  deliveryType: "pickup" | "delivery";
  deliveryFee: number;
  deliveryMinimumOrder: number;
  deliveryNotes: string;
  deliveryAddress: string;
  deliveryAddressDetails: DeliveryAddressDetails;
  isSubmitting: boolean;
  successMessage: string | null;
  successOrderId: string | null;
  successCustomerCode: string | null;
  successCustomerCodeWasProvided: boolean;
  errorMessage: string | null;
  initialCustomerCode: string;
  customerDisplayName: string | null;
  isLoadingCustomerProfile: boolean;
  onDeliveryTypeChange: (deliveryType: "pickup" | "delivery") => void;
  onDeliveryAddressChange: (deliveryAddress: string) => void;
  onDeliveryAddressDetailsChange: (
    deliveryAddressDetails: DeliveryAddressDetails
  ) => void;
  onCustomerCodeChange: (customerCode: string) => void;
  onForgetCustomerCode: () => void;
  onClose: () => void;
  onSubmit: (customerInfo: CustomerInfo) => void | Promise<void>;
}

type CustomerInfoErrors = Partial<Record<keyof CustomerInfo, string>>;
type DeliveryAddressErrors = Partial<Record<keyof DeliveryAddressDetails, string>>;

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

function formatDeliveryAddress(details: DeliveryAddressDetails): string {
  return [
    `${details.street.trim()} ${details.number.trim()}`.trim(),
    details.neighborhood.trim(),
    details.reference.trim(),
  ]
    .filter((part) => part.length > 0)
    .join(", ");
}

function validateDeliveryAddress(
  details: DeliveryAddressDetails
): DeliveryAddressErrors {
  const errors: DeliveryAddressErrors = {};

  if (details.street.trim().length === 0) {
    errors.street = "Escribe la calle.";
  }

  if (details.number.trim().length === 0) {
    errors.number = "Escribe el número.";
  }

  if (details.neighborhood.trim().length === 0) {
    errors.neighborhood = "Escribe la colonia.";
  }

  if (details.reference.trim().length === 0) {
    errors.reference = "Agrega una referencia.";
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
  deliveryMinimumOrder,
  deliveryNotes,
  deliveryAddress,
  deliveryAddressDetails,
  isSubmitting,
  successMessage,
  successOrderId,
  successCustomerCode,
  successCustomerCodeWasProvided,
  errorMessage,
  initialCustomerCode,
  customerDisplayName,
  isLoadingCustomerProfile,
  onDeliveryTypeChange,
  onDeliveryAddressChange,
  onDeliveryAddressDetailsChange,
  onCustomerCodeChange,
  onForgetCustomerCode,
  onClose,
  onSubmit,
}: CustomerInfoModalProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    nombre: "",
    telefono: "",
    customerCode: initialCustomerCode,
  });
  const [errors, setErrors] = useState<CustomerInfoErrors>({});
  const [deliveryAddressErrors, setDeliveryAddressErrors] =
    useState<DeliveryAddressErrors>({});

  const customerStatus = successMessage
    ? getCustomerFriendlyStatus(deliveryType)
    : null;

  function updateField(field: keyof CustomerInfo, value: string): void {
    setCustomerInfo((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));

    if (field === "customerCode") {
      onCustomerCodeChange(value);
    }

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
      setDeliveryAddressErrors({});
    }
  }

  function updateDeliveryAddressField(
    field: keyof DeliveryAddressDetails,
    value: string
  ): void {
    const nextDetails = {
      ...deliveryAddressDetails,
      [field]: value,
    };

    onDeliveryAddressDetailsChange(nextDetails);
    onDeliveryAddressChange(formatDeliveryAddress(nextDetails));

    setDeliveryAddressErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });
  }

  function forgetCustomerCode(): void {
    setCustomerInfo((currentValue) => ({
      ...currentValue,
      customerCode: "",
    }));
    onForgetCustomerCode();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedCustomerInfo: CustomerInfo = {
      nombre: customerInfo.nombre.trim(),
      telefono: customerInfo.telefono.trim().replace(/\D/g, ""),
      customerCode: customerInfo.customerCode?.trim(),
    };

    const validationErrors = validateCustomerInfo(normalizedCustomerInfo);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (deliveryType === "delivery") {
      const deliveryValidationErrors =
        validateDeliveryAddress(deliveryAddressDetails);
      const normalizedDeliveryAddress = formatDeliveryAddress(deliveryAddressDetails);

      if (Object.keys(deliveryValidationErrors).length > 0) {
        setDeliveryAddressErrors(deliveryValidationErrors);
        return;
      }

      onDeliveryAddressChange(normalizedDeliveryAddress);
      onDeliveryAddressDetailsChange({
        street: deliveryAddressDetails.street.trim(),
        number: deliveryAddressDetails.number.trim(),
        neighborhood: deliveryAddressDetails.neighborhood.trim(),
        reference: deliveryAddressDetails.reference.trim(),
      });
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
        className="absolute inset-0 touch-manipulation bg-black/60 backdrop-blur-[2px] transition-all duration-150 active:bg-black/70"
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[var(--tenant-radius)] bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text)] shadow-2xl ring-1 ring-[var(--tenant-ring)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[var(--tenant-accent)]">
              Confirmar pedido
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--tenant-text)]">
              Datos del cliente
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--tenant-muted)]">
              Ingresa tu nombre y teléfono para que el negocio pueda confirmar tu orden.
            </p>
          </div>

          <AppButton
            onClick={onClose}
            disabled={isSubmitting}
            variant="secondary"
            size="sm"
            className="shrink-0 !border-[var(--tenant-ring)] !bg-[var(--tenant-subtle)] text-[var(--tenant-text)] hover:!bg-[var(--tenant-background)] active:!bg-[var(--tenant-subtle)] focus-visible:ring-offset-[var(--tenant-surface)]"
          >
            Cerrar
          </AppButton>
        </div>

        <div className="mt-6 rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--tenant-accent)]">
            Total del pedido
          </p>

          <p className="mt-2 text-4xl font-black tracking-tight text-[var(--tenant-text)]">
            {formatCurrency(total)}
          </p>

          {deliveryType === "delivery" ? (
            <p className="mt-2 text-sm font-semibold text-[var(--tenant-muted)]">
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
              <div className="mt-4 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 ring-1 ring-[var(--tenant-ring)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-70">
                  Folio
                </p>
                <p className="mt-1 break-all text-base font-black">
                  {successOrderId}
                </p>
              </div>
            ) : null}

            {successCustomerCode ? (
              <div className="mt-4 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 ring-1 ring-[var(--tenant-ring)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-70">
                  Código cliente
                </p>
                <p className="mt-1 text-base font-black">
                  {successCustomerCodeWasProvided
                    ? `Pedido asociado a tu código de cliente: ${successCustomerCode}.`
                    : `Tu código de cliente es: ${successCustomerCode}. Guárdalo para tus próximos pedidos.`}
                </p>
              </div>
            ) : null}

            <AppButton
              onClick={onClose}
              className="mt-5 w-full !border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] px-5 py-3 text-sm text-[var(--tenant-button-text)] hover:!bg-[var(--tenant-primary-hover)] active:!bg-[var(--tenant-primary)] focus-visible:ring-offset-[var(--tenant-surface)]"
            >
              Entendido
            </AppButton>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {deliveryEnabled ? (
              <section className="rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-4">
                <p className="text-sm font-extrabold text-[var(--tenant-text)]">
                  Tipo de entrega
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateDeliveryType("pickup")}
                    className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-extrabold transition ${
                      deliveryType === "pickup"
                        ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-[var(--tenant-button-text)]"
                        : "border-[var(--tenant-ring)] bg-[var(--tenant-background)] text-[var(--tenant-muted)] hover:bg-[var(--tenant-surface)]"
                    }`}
                  >
                    Recoger pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDeliveryType("delivery")}
                    className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-extrabold transition ${
                      deliveryType === "delivery"
                        ? "border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-[var(--tenant-button-text)]"
                        : "border-[var(--tenant-ring)] bg-[var(--tenant-background)] text-[var(--tenant-muted)] hover:bg-[var(--tenant-surface)]"
                    }`}
                  >
                    Entrega a domicilio
                  </button>
                </div>

                {deliveryType === "delivery" ? (
                  <>
                    {deliveryMinimumOrder > 0 || deliveryNotes ? (
                      <p className="mt-4 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 text-sm font-semibold text-[var(--tenant-muted)] ring-1 ring-[var(--tenant-ring)]">
                        {deliveryMinimumOrder > 0
                          ? `Pedido mínimo para domicilio: ${formatCurrency(deliveryMinimumOrder)}.`
                          : ""}
                        {deliveryNotes
                          ? `${deliveryMinimumOrder > 0 ? " " : ""}${deliveryNotes}`
                          : ""}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <DeliveryField
                        label="Calle"
                        name="street"
                        value={deliveryAddressDetails.street}
                        error={deliveryAddressErrors.street}
                        onChange={(value) =>
                          updateDeliveryAddressField("street", value)
                        }
                      />
                      <DeliveryField
                        label="Número"
                        name="number"
                        value={deliveryAddressDetails.number}
                        error={deliveryAddressErrors.number}
                        onChange={(value) =>
                          updateDeliveryAddressField("number", value)
                        }
                      />
                      <DeliveryField
                        label="Colonia"
                        name="neighborhood"
                        value={deliveryAddressDetails.neighborhood}
                        error={deliveryAddressErrors.neighborhood}
                        onChange={(value) =>
                          updateDeliveryAddressField("neighborhood", value)
                        }
                      />
                      <DeliveryField
                        label="Referencia"
                        name="reference"
                        value={deliveryAddressDetails.reference}
                        error={deliveryAddressErrors.reference}
                        onChange={(value) =>
                          updateDeliveryAddressField("reference", value)
                        }
                      />
                    </div>

                    {deliveryAddress.trim().length > 0 ? (
                      <p className="mt-3 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 text-sm font-semibold text-[var(--tenant-muted)] ring-1 ring-[var(--tenant-ring)]">
                        {deliveryAddress}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 text-sm font-semibold text-[var(--tenant-muted)] ring-1 ring-[var(--tenant-ring)]">
                    Puedes pasar por tu pedido cuando esté listo.
                  </p>
                )}
              </section>
            ) : (
              <p className="rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-4 text-sm font-semibold text-[var(--tenant-muted)]">
                Puedes pasar por tu pedido cuando esté listo.
              </p>
            )}

            <label className="block">
              <span className="text-sm font-extrabold text-[var(--tenant-text)]">
                Nombre
              </span>

              <input
                type="text"
                name="nombre"
                value={customerInfo.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--tenant-ring)] bg-[var(--tenant-background)] px-4 py-4 text-base font-semibold text-[var(--tenant-text)] outline-none transition placeholder:text-[var(--tenant-muted)] focus:border-[var(--tenant-primary)] focus:ring-4 focus:ring-[var(--tenant-primary)]/20"
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
              <span className="text-sm font-extrabold text-[var(--tenant-text)]">
                Teléfono
              </span>

              <input
                type="tel"
                name="telefono"
                value={customerInfo.telefono}
                onChange={(event) => updateField("telefono", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--tenant-ring)] bg-[var(--tenant-background)] px-4 py-4 text-base font-semibold text-[var(--tenant-text)] outline-none transition placeholder:text-[var(--tenant-muted)] focus:border-[var(--tenant-primary)] focus:ring-4 focus:ring-[var(--tenant-primary)]/20"
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

            <section className="rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-subtle)] p-4">
              {customerDisplayName ? (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                  <span>Bienvenido {customerDisplayName}</span>
                  <button
                    type="button"
                    onClick={forgetCustomerCode}
                    className="shrink-0 text-xs font-extrabold text-[var(--tenant-muted)] underline-offset-4 hover:underline"
                  >
                    Olvidar
                  </button>
                </div>
              ) : null}

              {isLoadingCustomerProfile ? (
                <p className="mb-4 rounded-2xl bg-[var(--tenant-background)] px-4 py-3 text-sm font-semibold text-[var(--tenant-muted)] ring-1 ring-[var(--tenant-ring)]">
                  Buscando tu código de cliente...
                </p>
              ) : null}

              <label className="block">
                <span className="text-sm font-extrabold text-[var(--tenant-text)]">
                  Código de cliente
                </span>

                <input
                  type="text"
                  name="customerCode"
                  value={customerInfo.customerCode ?? ""}
                  onChange={(event) =>
                    updateField("customerCode", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[var(--tenant-ring)] bg-[var(--tenant-background)] px-4 py-4 text-base font-semibold uppercase text-[var(--tenant-text)] outline-none transition placeholder:normal-case placeholder:text-[var(--tenant-muted)] focus:border-[var(--tenant-primary)] focus:ring-4 focus:ring-[var(--tenant-primary)]/20"
                  placeholder="Ej. CHUY-48291"
                  autoComplete="off"
                />

                <span className="mt-2 block text-sm font-semibold leading-6 text-[var(--tenant-muted)]">
                  Si ya tienes código, escríbelo aquí. Si es tu primer pedido, te generaremos uno.
                </span>
              </label>
            </section>

            {errorMessage ? (
              <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/15 p-4 text-sm font-semibold leading-6 text-rose-300">
                No pudimos confirmar el pedido. Intenta de nuevo en unos segundos.
              </div>
            ) : null}

            <AppButton
              type="submit"
              loading={isSubmitting}
              loadingText="Enviando..."
              className="w-full !border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] px-5 py-4 text-base text-[var(--tenant-button-text)] shadow-lg shadow-black/20 hover:!bg-[var(--tenant-primary-hover)] active:!bg-[var(--tenant-primary)] focus-visible:ring-offset-[var(--tenant-surface)] disabled:!bg-[var(--tenant-ring)] disabled:text-[var(--tenant-muted)]"
            >
              Confirmar pedido
            </AppButton>
          </form>
        )}
      </div>
    </div>
  );
}

function DeliveryField({
  label,
  name,
  value,
  error,
  onChange,
}: {
  label: string;
  name: keyof DeliveryAddressDetails;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-[var(--tenant-text)]">
        {label}
      </span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[var(--tenant-ring)] bg-[var(--tenant-background)] px-4 py-4 text-base font-semibold text-[var(--tenant-text)] outline-none transition placeholder:text-[var(--tenant-muted)] focus:border-[var(--tenant-primary)] focus:ring-4 focus:ring-[var(--tenant-primary)]/20"
        autoComplete={name === "street" ? "address-line1" : "off"}
      />
      {error ? (
        <span className="mt-2 block text-sm font-semibold text-rose-300">
          {error}
        </span>
      ) : null}
    </label>
  );
}
