"use client";

import { useState, type FormEvent } from "react";

import { AppButton } from "@/components/ui/AppButton";
import {
  DESIGN_PRESETS_BY_CATEGORY,
  TENANT_CATEGORY_OPTIONS,
  getPresetForTenant,
  normalizeTenantCategory,
  type TenantCategory,
  type TenantDesignPreset,
} from "@/modules/design/tenantDesignPresets";

import type {
  SuperAdminOrderFlowMode,
  SuperAdminTenantInput,
  SuperAdminTenantStatus,
} from "../types/superAdmin";

type TenantFormField = keyof SuperAdminTenantInput;

interface TenantFormSectionProps {
  form: SuperAdminTenantInput;
  editingTenantId: string | null;
  isSaving: boolean;
  onChange: (form: SuperAdminTenantInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}

export function TenantFormSection({
  form,
  editingTenantId,
  isSaving,
  onChange,
  onSubmit,
  onReset,
}: TenantFormSectionProps) {
  const [showMetaAccessToken, setShowMetaAccessToken] =
    useState<boolean>(false);

  function updateFormField(field: TenantFormField, value: string): void {
    onChange({
      ...form,
      [field]:
        field === "estimatedPreparationMinutes"
          ? Number.parseInt(value, 10) || 1
          : value,
    });
  }

  function updateCategory(value: string): void {
    const category = normalizeTenantCategory(value);
    const currentPreset = getPresetForTenant(category, form.designPresetId);

    onChange({
      ...form,
      category,
      featuredCategory:
        form.featuredCategory.trim().length > 0
          ? form.featuredCategory
          : getCategoryLabel(category),
      designPresetId: currentPreset.id,
    });
  }

  function updateWhatsappActive(active: boolean): void {
    onChange({
      ...form,
      active,
    });
  }

  function updateTenantStatus(value: string): void {
    onChange({
      ...form,
      status: value === "inactive" ? "inactive" : "active",
    });
  }

  function updateOrderFlowMode(value: string): void {
    onChange({
      ...form,
      orderFlowMode:
        value === "dashboard_managed" ? "dashboard_managed" : "simple_whatsapp",
    });
  }

  function updateOrderConfirmationEnabled(enabled: boolean): void {
    onChange({
      ...form,
      orderConfirmationPolicy: {
        ...form.orderConfirmationPolicy,
        enabled,
        action: enabled ? "require_manual_confirmation" : "allow",
      },
    });
  }

  function updateOrderConfirmationThreshold(value: string): void {
    onChange({
      ...form,
      orderConfirmationPolicy: {
        ...form.orderConfirmationPolicy,
        amountThreshold: Number.parseFloat(value) || 0,
        action: form.orderConfirmationPolicy.enabled
          ? "require_manual_confirmation"
          : "allow",
      },
    });
  }

  function updateDeliveryEnabled(enabled: boolean): void {
    onChange({
      ...form,
      deliveryConfig: {
        ...form.deliveryConfig,
        enabled,
        fee: enabled ? form.deliveryConfig.fee ?? 0 : 0,
      },
      deliveryEnabled: enabled,
      deliveryFee: enabled ? form.deliveryConfig.fee ?? 0 : 0,
    });
  }

  function updateDeliveryFee(value: string): void {
    const fee = Number.parseFloat(value) || 0;

    onChange({
      ...form,
      deliveryConfig: {
        ...form.deliveryConfig,
        fee,
      },
      deliveryFee: fee,
    });
  }

  function updateDeliveryMinimumOrder(value: string): void {
    onChange({
      ...form,
      deliveryConfig: {
        ...form.deliveryConfig,
        minimumOrder: Number.parseFloat(value) || 0,
      },
    });
  }

  function updateDeliveryNotes(value: string): void {
    onChange({
      ...form,
      deliveryConfig: {
        ...form.deliveryConfig,
        notes: value,
      },
    });
  }

  function selectDesignPreset(preset: TenantDesignPreset): void {
    onChange({
      ...form,
      category: preset.category,
      designPresetId: preset.id,
    });
  }

  const selectedCategory = normalizeTenantCategory(form.category);
  const categoryPresets = DESIGN_PRESETS_BY_CATEGORY[selectedCategory];
  const selectedPreset = getPresetForTenant(
    selectedCategory,
    form.designPresetId
  );

  return (
    <form onSubmit={onSubmit}>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-700">
          {editingTenantId ? "Editar negocio" : "Nuevo negocio"}
        </p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">
          {editingTenantId ?? "Alta de negocio"}
        </h2>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-lg font-black text-stone-950">General</h3>
          <div className="mt-4 grid gap-4">
        <TextField
          label="tenantId"
          value={form.tenantId}
          onChange={(value) => updateFormField("tenantId", value)}
          disabled={editingTenantId !== null}
          required
        />
        <TextField
          label="Nombre"
          value={form.name}
          onChange={(value) => updateFormField("name", value)}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Categoría"
            value={form.category}
            onChange={updateCategory}
            options={TENANT_CATEGORY_OPTIONS}
          />
          <TextField
            label="Categoría bandera"
            value={form.featuredCategory}
            onChange={(value) => updateFormField("featuredCategory", value)}
            required
          />
        </div>
        <TextField
          label="Descripción"
          value={form.description}
          onChange={(value) => updateFormField("description", value)}
        />
        <TextField
          label="Saludo"
          value={form.greeting}
          onChange={(value) => updateFormField("greeting", value)}
        />
        <TextField
          label="Hero URL"
          value={form.heroImageUrl}
          onChange={(value) => updateFormField("heroImageUrl", value)}
        />
        <TextField
          label="Ubicación"
          value={form.location}
          onChange={(value) => updateFormField("location", value)}
        />
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <h3 className="text-lg font-black text-stone-950">
            WhatsApp
          </h3>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateWhatsappActive(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span className="block text-sm font-extrabold text-stone-900">
                WhatsApp Activo
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-500">
                Habilita el envío y recepción de mensajes para este negocio.
              </span>
            </span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="WhatsApp Business Phone"
              value={form.whatsappPhone}
              onChange={(value) => updateFormField("whatsappPhone", value)}
              placeholder="523221070973"
              required={editingTenantId === null}
            />
            <TextField
              label="Meta Phone Number ID"
              value={form.metaPhoneNumberId}
              onChange={(value) => updateFormField("metaPhoneNumberId", value)}
              helpText="ID del número de WhatsApp Business usado por Meta para enrutar mensajes al negocio."
              required={editingTenantId === null}
            />
          </div>
          <PasswordField
            label="Meta Access Token"
            value={form.metaAccessToken}
            onChange={(value) => updateFormField("metaAccessToken", value)}
            showValue={showMetaAccessToken}
            onToggleShow={() =>
              setShowMetaAccessToken((currentValue) => !currentValue)
            }
            required={editingTenantId === null}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Rating"
            value={form.rating}
            onChange={(value) => updateFormField("rating", value)}
          />
          <TextField
            label="Reviews"
            value={form.reviews}
            onChange={(value) => updateFormField("reviews", value)}
          />
          <TextField
            label="Tiempo"
            value={form.estimatedTime}
            onChange={(value) => updateFormField("estimatedTime", value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <h3 className="text-lg font-black text-stone-950">Pedidos</h3>
          </div>
          <SelectField
            label="Estado"
            value={form.status}
            onChange={updateTenantStatus}
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
          <SelectField
            label="Flujo"
            value={form.orderFlowMode}
            onChange={updateOrderFlowMode}
            options={[
              { value: "simple_whatsapp", label: "Simple WhatsApp" },
              { value: "dashboard_managed", label: "Dashboard" },
            ]}
          />
          <TextField
            label="Preparación"
            type="number"
            value={String(form.estimatedPreparationMinutes)}
            onChange={(value) =>
              updateFormField("estimatedPreparationMinutes", value)
            }
          />
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-stone-950">
                Diseño visual
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-stone-600">
                El tenant guarda solo el preset seleccionado para su categoría.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-orange-800 ring-1 ring-orange-100">
              {getCategoryLabel(selectedCategory)}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {categoryPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={preset.id === selectedPreset.id}
                onSelect={() => selectDesignPreset(preset)}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <h3 className="text-lg font-black text-stone-950">
            Protección de pedidos grandes
          </h3>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.orderConfirmationPolicy.enabled}
              onChange={(event) =>
                updateOrderConfirmationEnabled(event.target.checked)
              }
              className="mt-1 h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span>
              <span className="block text-sm font-extrabold text-stone-900">
                Requerir confirmación en pedidos grandes
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-500">
                Los pedidos iguales o mayores a este monto requerirán
                confirmación del negocio antes de prepararse.
              </span>
            </span>
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-extrabold text-stone-900">
              Monto desde
            </span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={String(form.orderConfirmationPolicy.amountThreshold)}
              onChange={(event) =>
                updateOrderConfirmationThreshold(event.target.value)
              }
              required
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <h3 className="text-lg font-black text-stone-950">
            Entrega a domicilio
          </h3>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.deliveryConfig.enabled}
              onChange={(event) => updateDeliveryEnabled(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span>
              <span className="block text-sm font-extrabold text-stone-900">
                Entrega a domicilio
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-500">
                Muestra la opción de envío en el checkout del cliente.
              </span>
            </span>
          </label>
          {form.deliveryConfig.enabled ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-extrabold text-stone-900">
                Costo de envío
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={String(form.deliveryConfig.fee ?? 0)}
                onChange={(event) => updateDeliveryFee(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-stone-900">
                Pedido mínimo
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={String(form.deliveryConfig.minimumOrder ?? 0)}
                onChange={(event) =>
                  updateDeliveryMinimumOrder(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-extrabold text-stone-900">
                Notas de entrega
              </span>
              <textarea
                value={form.deliveryConfig.notes ?? ""}
                onChange={(event) => updateDeliveryNotes(event.target.value)}
                className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <AppButton
          type="submit"
          loading={isSaving}
          loadingText="Guardando..."
        >
          Guardar cambios
        </AppButton>
        <AppButton
          onClick={onReset}
          variant="secondary"
          disabled={isSaving}
        >
          {editingTenantId ? "Cancelar" : "Limpiar"}
        </AppButton>
        {editingTenantId ? (
          <a
            href={`/${editingTenantId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-sm font-extrabold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            Ver webapp pública
          </a>
        ) : null}
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  helpText,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-stone-900">{label}</span>
      {helpText ? (
        <span className="mt-1 block text-xs font-semibold leading-5 text-stone-500">
          {helpText}
        </span>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showValue,
  onToggleShow,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showValue: boolean;
  onToggleShow: () => void;
  required?: boolean;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-extrabold text-stone-900">{label}</span>
      <span className="mt-2 flex rounded-2xl border border-stone-300 bg-white focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
        <input
          type={showValue ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="min-w-0 flex-1 rounded-l-2xl bg-transparent px-4 py-3 text-sm font-semibold text-stone-950 outline-none"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="shrink-0 rounded-r-2xl border-l border-stone-200 px-4 py-3 text-sm font-extrabold text-stone-700 transition hover:bg-stone-50"
        >
          {showValue ? "Ocultar" : "Mostrar"}
        </button>
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: SuperAdminTenantStatus | SuperAdminOrderFlowMode | TenantCategory;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-stone-900">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getCategoryLabel(category: TenantCategory): string {
  return (
    TENANT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Generico"
  );
}

function getPresetRadiusClass(radius: TenantDesignPreset["borderRadius"]): string {
  if (radius === "large") {
    return "1.5rem";
  }

  if (radius === "medium") {
    return "1rem";
  }

  return "0.75rem";
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: TenantDesignPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "rounded-2xl border bg-white p-3 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md",
        selected
          ? "border-orange-500 ring-4 ring-orange-100"
          : "border-stone-200",
      ].join(" ")}
      aria-pressed={selected}
    >
      <div
        className="overflow-hidden rounded-xl p-3"
        style={{
          backgroundColor: preset.backgroundColor,
          color: preset.textColor,
          borderRadius: getPresetRadiusClass(preset.borderRadius),
        }}
      >
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: preset.cardColor,
            border: `1px solid ${preset.secondaryColor}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: preset.primaryColor }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{preset.name}</p>
              <p className="text-[11px] font-bold opacity-70">
                {preset.fontMood}
              </p>
            </div>
          </div>
          <div
            className="mt-3 rounded-full px-3 py-2 text-center text-xs font-black"
            style={{
              backgroundColor: preset.primaryColor,
              color: preset.buttonTextColor,
            }}
          >
            Agregar
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map(
          (color) => (
            <span
              key={color}
              className="h-5 w-5 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )
        )}
      </div>
      <p className="mt-3 text-sm font-black text-stone-950">{preset.name}</p>
      {selected ? (
        <p className="mt-1 text-xs font-black text-orange-700">Seleccionado</p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-stone-600">
        {preset.description}
      </p>
    </button>
  );
}
