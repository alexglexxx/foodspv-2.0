"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import { generateThemeFromCategory } from "@/modules/theme/agents/designerAgent";
import {
  DEFAULT_TENANT_THEME,
  TENANT_THEME_PRESET_OPTIONS,
  TENANT_THEME_PRESETS,
} from "@/modules/theme/constants/themePresets";

import {
  createSuperAdminTenant,
  deleteSuperAdminTenant,
  fetchSuperAdminTenants,
  updateSuperAdminTenant,
} from "../services/superAdminApiService";
import type {
  SuperAdminOrderFlowMode,
  SuperAdminTenantInput,
  SuperAdminTenantStatus,
  SuperAdminTenantSummary,
} from "../types/superAdmin";
import { ProductManager } from "./ProductManager";

const EMPTY_TENANT_FORM: SuperAdminTenantInput = {
  tenantId: "",
  name: "",
  category: "",
  featuredCategory: "",
  description: "",
  greeting: "",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  heroImageUrl: "",
  whatsappPhone: "",
  metaPhoneNumberId: "",
  rating: "4.8",
  reviews: "0",
  status: "active",
  orderFlowMode: "simple_whatsapp",
  estimatedPreparationMinutes: 20,
  orderConfirmationPolicy: {
    enabled: false,
    amountThreshold: 1,
    action: "allow",
  },
  tenantTheme: DEFAULT_TENANT_THEME,
};

type TenantFormField = keyof SuperAdminTenantInput;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function getTenantFormFromSummary(
  tenant: SuperAdminTenantSummary
): SuperAdminTenantInput {
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    category: tenant.category,
    featuredCategory: tenant.featuredCategory,
    description: tenant.description,
    greeting: tenant.greeting,
    estimatedTime: tenant.estimatedTime,
    location: tenant.location,
    heroImageUrl: tenant.heroImageUrl,
    whatsappPhone: tenant.whatsappPhone,
    metaPhoneNumberId: tenant.metaPhoneNumberId,
    rating: tenant.rating,
    reviews: tenant.reviews,
    status: tenant.status,
    orderFlowMode: tenant.orderFlowMode,
    estimatedPreparationMinutes: tenant.estimatedPreparationMinutes,
    orderConfirmationPolicy: tenant.orderConfirmationPolicy,
    tenantTheme: tenant.tenantTheme,
  };
}

function getStatusClassName(status: SuperAdminTenantStatus): string {
  return status === "active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-stone-100 text-stone-600 ring-stone-200";
}

export function SuperAdminClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [tenants, setTenants] = useState<SuperAdminTenantSummary[]>([]);
  const [form, setForm] = useState<SuperAdminTenantInput>(EMPTY_TENANT_FORM);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      tenants.reduce(
        (currentTotals, tenant) => ({
          tenantsCount: currentTotals.tenantsCount + 1,
          activeTenantsCount:
            currentTotals.activeTenantsCount +
            (tenant.status === "active" ? 1 : 0),
          productsCount: currentTotals.productsCount + tenant.stats.productsCount,
          ordersCount: currentTotals.ordersCount + tenant.stats.ordersCount,
          pendingOrdersCount:
            currentTotals.pendingOrdersCount + tenant.stats.pendingOrdersCount,
          totalSales: currentTotals.totalSales + tenant.stats.totalSales,
        }),
        {
          tenantsCount: 0,
          activeTenantsCount: 0,
          productsCount: 0,
          ordersCount: 0,
          pendingOrdersCount: 0,
          totalSales: 0,
        }
      ),
    [tenants]
  );
  const selectedTenant = useMemo(
    () =>
      editingTenantId
        ? tenants.find((tenant) => tenant.tenantId === editingTenantId) ?? null
        : null,
    [editingTenantId, tenants]
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadTenants(user);
  }, [user]);

  async function loadTenants(currentUser: User): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchSuperAdminTenants(currentUser);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setTenants(response.tenants);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar tenants."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSigningIn(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch {
      setErrorMessage("No se pudo iniciar sesión con esas credenciales.");
    } finally {
      setIsSigningIn(false);
    }
  }

  function updateFormField(field: TenantFormField, value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === "estimatedPreparationMinutes"
          ? Number.parseInt(value, 10) || 1
          : value,
    }));
  }

  function updateTenantStatus(value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      status: value === "inactive" ? "inactive" : "active",
    }));
  }

  function updateOrderFlowMode(value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      orderFlowMode:
        value === "dashboard_managed" ? "dashboard_managed" : "simple_whatsapp",
    }));
  }

  function updateOrderConfirmationEnabled(enabled: boolean): void {
    setForm((currentForm) => ({
      ...currentForm,
      orderConfirmationPolicy: {
        ...currentForm.orderConfirmationPolicy,
        enabled,
        action: enabled ? "require_manual_confirmation" : "allow",
      },
    }));
  }

  function updateOrderConfirmationThreshold(value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      orderConfirmationPolicy: {
        ...currentForm.orderConfirmationPolicy,
        amountThreshold: Number.parseFloat(value) || 0,
        action: currentForm.orderConfirmationPolicy.enabled
          ? "require_manual_confirmation"
          : "allow",
      },
    }));
  }

  function applyTenantThemePreset(presetKey: keyof typeof TENANT_THEME_PRESETS): void {
    setForm((currentForm) => ({
      ...currentForm,
      tenantTheme: TENANT_THEME_PRESETS[presetKey],
    }));
  }

  function applyTenantThemeFromCategory(): void {
    setForm((currentForm) => ({
      ...currentForm,
      tenantTheme: generateThemeFromCategory(currentForm.category),
    }));
  }

  function resetForm(): void {
    setForm(EMPTY_TENANT_FORM);
    setEditingTenantId(null);
    setMessage(null);
    setErrorMessage(null);
  }

  function editTenant(tenant: SuperAdminTenantSummary): void {
    setForm(getTenantFormFromSummary(tenant));
    setEditingTenantId(tenant.tenantId);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSaveTenant(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Sesión requerida.");
      return;
    }

    if (
      !Number.isFinite(form.orderConfirmationPolicy.amountThreshold) ||
      form.orderConfirmationPolicy.amountThreshold < 1
    ) {
      setMessage(null);
      setErrorMessage(
        "Monto desde es obligatorio y debe ser mayor o igual a 1."
      );
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = editingTenantId
        ? await updateSuperAdminTenant(user, editingTenantId, {
            ...form,
            orderConfirmationPolicy: {
              ...form.orderConfirmationPolicy,
              action: form.orderConfirmationPolicy.enabled
                ? "require_manual_confirmation"
                : "allow",
            },
          })
        : await createSuperAdminTenant(user, {
            ...form,
            orderConfirmationPolicy: {
              ...form.orderConfirmationPolicy,
              action: form.orderConfirmationPolicy.enabled
                ? "require_manual_confirmation"
                : "allow",
            },
          });

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setMessage(editingTenantId ? "Tenant actualizado." : "Tenant creado.");
      resetForm();
      await loadTenants(user);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el tenant."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTenant(tenantId: string): Promise<void> {
    if (!user) {
      setErrorMessage("Sesión requerida.");
      return;
    }

    setDeletingTenantId(tenantId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await deleteSuperAdminTenant(user, tenantId);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      if (editingTenantId === tenantId) {
        resetForm();
      }

      setMessage("Tenant desactivado.");
      await loadTenants(user);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo desactivar el tenant."
      );
    } finally {
      setDeletingTenantId(null);
    }
  }

  async function copyTenantUrl(tenant: SuperAdminTenantSummary): Promise<void> {
    if (!tenant.publicUrl) {
      setErrorMessage("No configurada");
      setMessage(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(tenant.publicUrl);
      setMessage("URL pública copiada.");
      setErrorMessage(null);
    } catch {
      setErrorMessage("No se pudo copiar la URL pública.");
      setMessage(null);
    }
  }

  function downloadTenantQr(tenant: SuperAdminTenantSummary): void {
    if (!tenant.qrCode) {
      setErrorMessage("QR no disponible");
      setMessage(null);
      return;
    }

    const link = document.createElement("a");
    link.href = tenant.qrCode;
    link.download = `tenant-${tenant.tenantId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("QR descargado.");
    setErrorMessage(null);
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <div className="rounded-[2rem] bg-white p-8 text-sm font-semibold shadow-xl ring-1 ring-stone-200">
          Cargando acceso...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10 text-stone-900">
        <form
          onSubmit={(event) => void handleSignIn(event)}
          className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-stone-200"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-orange-600">
            SuperAdmin
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Acceso global
          </h1>

          <label className="mt-8 block">
            <span className="text-sm font-extrabold">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              autoComplete="email"
              required
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-extrabold">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? (
            <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSigningIn}
            className="mt-6 w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-stone-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-orange-300">
                SuperAdmin
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Control global de tenants
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
                Administra negocios, modos de operación y métricas globales desde
                una sola vista.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-950 transition hover:bg-stone-100"
            >
              Salir
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Tenants" value={String(totals.tenantsCount)} />
          <Metric label="Activos" value={String(totals.activeTenantsCount)} />
          <Metric label="Productos" value={String(totals.productsCount)} />
          <Metric label="Pedidos" value={String(totals.ordersCount)} />
          <Metric label="Pendientes" value={String(totals.pendingOrdersCount)} />
          <Metric label="Ventas" value={formatCurrency(totals.totalSales)} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <form
            onSubmit={(event) => void handleSaveTenant(event)}
            className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-600">
              {editingTenantId ? "Editar tenant" : "Nuevo tenant"}
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {editingTenantId ?? "Alta de negocio"}
            </h2>

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
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <h3 className="text-lg font-black">Presets rápidos</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyTenantThemeFromCategory}
                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100"
                  >
                    Usar categoría
                  </button>
                  {TENANT_THEME_PRESET_OPTIONS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyTenantThemePreset(preset.key)}
                      className="rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-extrabold text-stone-800 transition hover:bg-stone-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
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
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <h3 className="text-lg font-black">
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
                      Los pedidos iguales o mayores a este monto requerirán confirmación del negocio antes de prepararse.
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
            </div>

            {message ? (
              <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {message}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar tenant"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100"
              >
                Limpiar
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-600">
                  Tenants
                </p>
                <h2 className="mt-2 text-2xl font-black">Negocios registrados</h2>
              </div>
              <button
                type="button"
                onClick={() => void loadTenants(user)}
                disabled={isLoading}
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            {isLoading ? (
              <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-500">
                Cargando tenants...
              </p>
            ) : null}

            {!isLoading && tenants.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
                No hay tenants registrados.
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              {tenants.map((tenant) => (
                <article
                  key={tenant.tenantId}
                  className="rounded-[1.5rem] border border-stone-200 p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black">{tenant.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${getStatusClassName(
                            tenant.status
                          )}`}
                        >
                          {tenant.status === "active" ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-stone-500">
                        {tenant.tenantId} · {tenant.category} ·{" "}
                        {tenant.orderFlowMode}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        {tenant.description || "Sin descripción configurada."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editTenant(tenant)}
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-stone-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTenant(tenant.tenantId)}
                        disabled={deletingTenantId === tenant.tenantId}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingTenantId === tenant.tenantId
                          ? "Desactivando..."
                          : "Desactivar"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <MiniMetric label="Productos" value={tenant.stats.productsCount} />
                    <MiniMetric
                      label="Activos"
                      value={tenant.stats.activeProductsCount}
                    />
                    <MiniMetric label="Pedidos" value={tenant.stats.ordersCount} />
                    <MiniMetric
                      label="Pendientes"
                      value={tenant.stats.pendingOrdersCount}
                    />
                    <MiniMetric
                      label="Ventas"
                      value={formatCurrency(tenant.stats.totalSales)}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 rounded-2xl bg-stone-50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-400">
                        URL pública
                      </p>
                      <p className="mt-2 break-all text-sm font-bold text-stone-700">
                        {tenant.publicUrl || "No configurada"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void copyTenantUrl(tenant)}
                          disabled={!tenant.publicUrl}
                          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Copiar URL
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTenantQr(tenant)}
                          disabled={!tenant.qrCode}
                          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Descargar QR
                        </button>
                      </div>
                    </div>

                    <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-stone-200">
                      {tenant.qrCode ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tenant.qrCode}
                          alt={`QR público de ${tenant.name}`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-center text-xs font-extrabold text-stone-400">
                          QR no disponible
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        {selectedTenant ? (
          <ProductManager
            key={selectedTenant.tenantId}
            user={user}
            tenantId={selectedTenant.tenantId}
            tenantName={selectedTenant.name}
            onProductsChanged={() => loadTenants(user)}
          />
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
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
  value:
    | SuperAdminTenantStatus
    | SuperAdminOrderFlowMode;
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
