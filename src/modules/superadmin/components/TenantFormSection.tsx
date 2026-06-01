"use client";

import { type FormEvent } from "react";

import { AppButton } from "@/components/ui/AppButton";
import { generateThemeFromCategory } from "@/modules/theme/agents/designerAgent";
import {
  TENANT_THEME_PRESET_OPTIONS,
  TENANT_THEME_PRESETS,
} from "@/modules/theme/constants/themePresets";

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
  function updateFormField(field: TenantFormField, value: string): void {
    onChange({
      ...form,
      [field]:
        field === "estimatedPreparationMinutes"
          ? Number.parseInt(value, 10) || 1
          : value,
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
      deliveryEnabled: enabled,
      deliveryFee: enabled ? form.deliveryFee : 0,
    });
  }

  function updateDeliveryFee(value: string): void {
    onChange({
      ...form,
      deliveryFee: Number.parseFloat(value) || 0,
    });
  }

  function applyTenantThemePreset(
    presetKey: keyof typeof TENANT_THEME_PRESETS
  ): void {
    onChange({
      ...form,
      tenantTheme: TENANT_THEME_PRESETS[presetKey],
    });
  }

  function applyTenantThemeFromCategory(): void {
    onChange({
      ...form,
      tenantTheme: generateThemeFromCategory(form.category),
    });
  }

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
          <TextField
            label="Categoría"
            value={form.category}
            onChange={(value) => updateFormField("category", value)}
            required
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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="WhatsApp"
            value={form.whatsappPhone}
            onChange={(value) => updateFormField("whatsappPhone", value)}
          />
          <TextField
            label="Ubicación"
            value={form.location}
            onChange={(value) => updateFormField("location", value)}
          />
        </div>
        <TextField
          label="Meta Phone Number ID"
          value={form.metaPhoneNumberId}
          onChange={(value) => updateFormField("metaPhoneNumberId", value)}
          helpText="ID del número de WhatsApp Business usado por Meta para enrutar mensajes al negocio."
          required={form.orderFlowMode === "simple_whatsapp"}
        />
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
          <h3 className="text-lg font-black text-stone-950">Diseño visual</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <AppButton
              onClick={applyTenantThemeFromCategory}
              variant="secondary"
              size="sm"
              className="min-h-10 border-orange-200 text-xs text-orange-800 hover:bg-orange-100"
            >
              Usar categoría
            </AppButton>
            {TENANT_THEME_PRESET_OPTIONS.map((preset) => (
              <AppButton
                key={preset.key}
                onClick={() => applyTenantThemePreset(preset.key)}
                variant="secondary"
                size="sm"
                className="min-h-10 text-xs"
              >
                {preset.label}
              </AppButton>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-orange-100">
            <span
              className="h-8 w-8 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: form.tenantTheme.primaryColor }}
              aria-hidden="true"
            />
            <span
              className="h-8 w-8 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: form.tenantTheme.secondaryColor }}
              aria-hidden="true"
            />
            <span
              className="h-8 w-8 rounded-full ring-1 ring-stone-200"
              style={{ backgroundColor: form.tenantTheme.accentColor }}
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-stone-700">
              {form.tenantTheme.visualStyle} · {form.tenantTheme.typography}
            </span>
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
              checked={form.deliveryEnabled}
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
          {form.deliveryEnabled ? (
            <label className="mt-4 block">
              <span className="text-sm font-extrabold text-stone-900">
                Costo de envío
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={String(form.deliveryFee)}
                onChange={(event) => updateDeliveryFee(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <AppButton
          type="submit"
          loading={isSaving}
          loadingText="Guardando..."
        >
          Guardar negocio
        </AppButton>
        <AppButton
          onClick={onReset}
          variant="secondary"
          disabled={isSaving}
        >
          Limpiar
        </AppButton>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
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
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
      />
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
  value: SuperAdminTenantStatus | SuperAdminOrderFlowMode;
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
