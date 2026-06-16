"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { AppButton } from "@/components/ui/AppButton";
import { auth } from "@/lib/firebase/client";
import { getVisualPreset } from "@/modules/design/tenantVisualPresets";

import {
  createSuperAdminTenant,
  deleteSuperAdminTenant,
  fetchSuperAdminTenants,
  permanentlyDeleteTenant,
  updateSuperAdminTenant,
} from "../services/superAdminApiService";
import type {
  SuperAdminTenantInput,
  SuperAdminTenantSummary,
} from "../types/superAdmin";
import { CollapsibleSection } from "./CollapsibleSection";
import { ProductManager } from "./ProductManager";
import { TenantAccessCard } from "./TenantAccessCard";
import { TenantFormSection } from "./TenantFormSection";
import { TenantList } from "./TenantList";

const EMPTY_TENANT_FORM: SuperAdminTenantInput = {
  tenantId: "",
  name: "",
  category: "generico",
  featuredCategory: "Generico",
  visualPresetId: "fresh",
  description: "",
  greeting: "",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  heroImageUrl: "",
  active: true,
  whatsappPhone: "",
  metaPhoneNumberId: "",
  metaAccessToken: "",
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
  deliveryConfig: {
    enabled: false,
    fee: 0,
    minimumOrder: 0,
    notes: "",
  },
  deliveryEnabled: false,
  deliveryFee: 0,
};

type SectionKey = "create" | "tenants" | "products" | "theme" | "operations";

function getTenantFormFromSummary(
  tenant: SuperAdminTenantSummary
): SuperAdminTenantInput {
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    category: tenant.category,
    featuredCategory: tenant.featuredCategory,
    visualPresetId: tenant.visualPresetId,
    description: tenant.description,
    greeting: tenant.greeting,
    estimatedTime: tenant.estimatedTime,
    location: tenant.location,
    heroImageUrl: tenant.heroImageUrl,
    active: tenant.active,
    whatsappPhone: tenant.whatsappPhone,
    metaPhoneNumberId: tenant.metaPhoneNumberId,
    metaAccessToken: tenant.metaAccessToken,
    rating: tenant.rating,
    reviews: tenant.reviews,
    status: tenant.status,
    orderFlowMode: tenant.orderFlowMode,
    estimatedPreparationMinutes: tenant.estimatedPreparationMinutes,
    orderConfirmationPolicy: tenant.orderConfirmationPolicy,
    deliveryConfig: tenant.deliveryConfig,
    deliveryEnabled: tenant.deliveryConfig.enabled,
    deliveryFee: tenant.deliveryConfig.enabled ? tenant.deliveryConfig.fee ?? 0 : 0,
  };
}

function getWhatsappValidationError(form: SuperAdminTenantInput): string | null {
  const whatsappPhoneDigits = form.whatsappPhone.replace(/\D/g, "");
  const hasWhatsappConfiguration =
    whatsappPhoneDigits.length > 0 ||
    form.metaPhoneNumberId.trim().length > 0 ||
    form.metaAccessToken.trim().length > 0;

  if (!hasWhatsappConfiguration) {
    return null;
  }

  if (whatsappPhoneDigits.length < 12) {
    return "WhatsApp Business Phone debe tener al menos 12 dígitos.";
  }

  if (form.metaPhoneNumberId.trim().length < 10) {
    return "Meta Phone Number ID debe tener al menos 10 caracteres.";
  }

  if (form.metaAccessToken.trim().length < 20) {
    return "Meta Access Token debe tener al menos 20 caracteres.";
  }

  return null;
}

function normalizeTenantFormForSave(
  form: SuperAdminTenantInput
): SuperAdminTenantInput {
  return {
    ...form,
    whatsappPhone: form.whatsappPhone.replace(/\D/g, ""),
    metaPhoneNumberId: form.metaPhoneNumberId.trim(),
    metaAccessToken: form.metaAccessToken.trim(),
    deliveryConfig: {
      ...form.deliveryConfig,
      enabled: form.deliveryConfig.enabled,
      fee: form.deliveryConfig.enabled ? form.deliveryConfig.fee ?? 0 : 0,
      minimumOrder: form.deliveryConfig.minimumOrder ?? 0,
      notes: form.deliveryConfig.notes?.trim() ?? "",
    },
    deliveryEnabled: form.deliveryConfig.enabled,
    deliveryFee: form.deliveryConfig.enabled ? form.deliveryConfig.fee ?? 0 : 0,
    orderConfirmationPolicy: {
      ...form.orderConfirmationPolicy,
      action: form.orderConfirmationPolicy.enabled
        ? "require_manual_confirmation"
        : "allow",
    },
  };
}

export function SuperAdminClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [tenants, setTenants] = useState<SuperAdminTenantSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [form, setForm] = useState<SuperAdminTenantInput>(EMPTY_TENANT_FORM);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    {
      create: false,
      tenants: true,
      products: false,
      theme: false,
      operations: false,
    }
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [permanentlyDeletingTenantId, setPermanentlyDeletingTenantId] =
    useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLoadingTenantsRef = useRef<boolean>(false);
  const isSigningInRef = useRef<boolean>(false);
  const isSavingTenantRef = useRef<boolean>(false);
  const deletingTenantRef = useRef<string | null>(null);
  const permanentlyDeletingTenantRef = useRef<string | null>(null);

  const selectedTenant = useMemo(
    () =>
      selectedTenantId
        ? tenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null
        : null,
    [selectedTenantId, tenants]
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

  function toggleSection(sectionKey: SectionKey): void {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
  }

  function openSection(sectionKey: SectionKey): void {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: true,
    }));
  }

  async function loadTenants(currentUser: User): Promise<void> {
    if (isLoadingTenantsRef.current) {
      return;
    }

    isLoadingTenantsRef.current = true;
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
      isLoadingTenantsRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSigningInRef.current) {
      return;
    }

    isSigningInRef.current = true;
    setIsSigningIn(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch {
      setErrorMessage("No se pudo iniciar sesión con esas credenciales.");
    } finally {
      isSigningInRef.current = false;
      setIsSigningIn(false);
    }
  }

  function resetForm(): void {
    setForm(EMPTY_TENANT_FORM);
    setEditingTenantId(null);
    setMessage(null);
    setErrorMessage(null);
  }

  function selectTenant(tenant: SuperAdminTenantSummary): void {
    setSelectedTenantId(tenant.tenantId);
    setMessage(`Negocio seleccionado: ${tenant.name}`);
    setErrorMessage(null);
  }

  function editTenant(tenant: SuperAdminTenantSummary): void {
    setForm(getTenantFormFromSummary(tenant));
    setEditingTenantId(tenant.tenantId);
    setSelectedTenantId(tenant.tenantId);
    openSection("create");
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSaveTenant(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (isSavingTenantRef.current) {
      return;
    }

    if (!user) {
      setErrorMessage("Sesión requerida.");
      return;
    }

    const whatsappValidationError = editingTenantId
      ? null
      : getWhatsappValidationError(form);

    if (whatsappValidationError) {
      setMessage(null);
      setErrorMessage(whatsappValidationError);
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

    if (
      form.deliveryConfig.enabled &&
      (!Number.isFinite(form.deliveryConfig.fee ?? 0) ||
        (form.deliveryConfig.fee ?? 0) < 0)
    ) {
      setMessage(null);
      setErrorMessage("Costo de envío debe ser un número mayor o igual a 0.");
      return;
    }

    isSavingTenantRef.current = true;
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const tenantInput = normalizeTenantFormForSave(form);
      const response = editingTenantId
        ? await updateSuperAdminTenant(user, editingTenantId, tenantInput)
        : await createSuperAdminTenant(user, tenantInput);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      const savedTenantId =
        response.tenant?.tenantId ?? editingTenantId ?? form.tenantId;

      setForm(EMPTY_TENANT_FORM);
      setEditingTenantId(null);
      setSelectedTenantId(savedTenantId);
      setOpenSections((currentSections) => ({
        ...currentSections,
        create: false,
        tenants: true,
      }));
      setMessage(editingTenantId ? "Negocio actualizado." : "Negocio creado.");
      await loadTenants(user);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el tenant."
      );
    } finally {
      isSavingTenantRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleDeleteTenant(tenantId: string): Promise<void> {
    if (
      deletingTenantRef.current !== null ||
      permanentlyDeletingTenantRef.current !== null
    ) {
      return;
    }

    if (!user) {
      setErrorMessage("Sesión requerida.");
      return;
    }

    deletingTenantRef.current = tenantId;
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

      setSelectedTenantId(tenantId);
      setMessage("Negocio desactivado.");
      await loadTenants(user);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo desactivar el tenant."
      );
    } finally {
      deletingTenantRef.current = null;
      setDeletingTenantId(null);
    }
  }

  async function handlePermanentDeleteTenant(tenantId: string): Promise<void> {
    if (
      deletingTenantRef.current !== null ||
      permanentlyDeletingTenantRef.current !== null
    ) {
      return;
    }

    if (!user) {
      setErrorMessage("Sesión requerida.");
      return;
    }

    if (!tenantId) {
      setErrorMessage("tenantId requerido para eliminar.");
      setMessage(null);
      return;
    }

    const confirmed = window.confirm(
      "¿Eliminar este negocio y sus datos de prueba?"
    );

    if (!confirmed) {
      return;
    }

    permanentlyDeletingTenantRef.current = tenantId;
    setPermanentlyDeletingTenantId(tenantId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await permanentlyDeleteTenant(user, tenantId);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setTenants((currentTenants) =>
        currentTenants.filter((tenant) => tenant.tenantId !== tenantId)
      );

      if (selectedTenantId === tenantId) {
        setSelectedTenantId(null);
      }

      if (editingTenantId === tenantId) {
        resetForm();
      }

      setMessage("Negocio eliminado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el negocio."
      );
    } finally {
      permanentlyDeletingTenantRef.current = null;
      setPermanentlyDeletingTenantId(null);
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
        <div className="rounded-2xl bg-white p-8 text-sm font-semibold shadow-xl ring-1 ring-stone-200">
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
          className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-stone-200"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-700">
            SuperAdmin
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
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

          <AppButton
            type="submit"
            loading={isSigningIn}
            loadingText="Entrando..."
            className="mt-6 w-full"
          >
            Entrar
          </AppButton>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-stone-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-orange-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-stone-950">
              FoodSPV SuperAdmin
            </h1>
            <p className="mt-1 text-sm font-semibold text-stone-600">
              Panel global de administración
            </p>
          </div>

          <AppButton
            onClick={() => void signOut(auth)}
            variant="secondary"
            className="border-orange-200 text-orange-800 hover:bg-orange-50"
          >
            Salir
          </AppButton>
        </header>

        {message ? (
          <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
            {message}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4">
          <CollapsibleSection
            title="Crear / editar negocio"
            description="Alta y edición de datos generales, theme, Meta y políticas."
            isOpen={openSections.create}
            onToggle={() => toggleSection("create")}
            badge={editingTenantId ? "Editando" : undefined}
          >
            <TenantFormSection
              form={form}
              editingTenantId={editingTenantId}
              isSaving={isSaving}
              onChange={setForm}
              onReset={resetForm}
              onSubmit={(event) => void handleSaveTenant(event)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Negocios registrados"
            description="Selecciona un negocio para ver su acceso, productos y configuración."
            isOpen={openSections.tenants}
            onToggle={() => toggleSection("tenants")}
            badge={selectedTenant?.name}
          >
            <TenantList
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              isLoading={isLoading}
              deletingTenantId={deletingTenantId}
              permanentlyDeletingTenantId={permanentlyDeletingTenantId}
              onRefresh={() => void loadTenants(user)}
              onSelect={selectTenant}
              onEdit={editTenant}
              onDeactivate={(tenantId) => void handleDeleteTenant(tenantId)}
              onPermanentDelete={(tenantId) =>
                void handlePermanentDeleteTenant(tenantId)
              }
            />

            {selectedTenant ? (
              <div className="mt-5">
                <TenantAccessCard
                  tenant={selectedTenant}
                  onCopyUrl={(tenant) => void copyTenantUrl(tenant)}
                  onDownloadQr={downloadTenantQr}
                />
              </div>
            ) : null}
          </CollapsibleSection>

          {selectedTenant ? (
            <CollapsibleSection
              title="Productos del negocio seleccionado"
              description="Menú editable del negocio seleccionado."
              isOpen={openSections.products}
              onToggle={() => toggleSection("products")}
              badge={selectedTenant.name}
            >
              <ProductManager
                key={selectedTenant.tenantId}
                user={user}
                tenantId={selectedTenant.tenantId}
                tenantName={selectedTenant.name}
                onProductsChanged={() => loadTenants(user)}
              />
            </CollapsibleSection>
          ) : null}

          {selectedTenant ? (
            <CollapsibleSection
              title="Diseño visual"
              description="Preset aplicado al menú público del negocio seleccionado."
              isOpen={openSections.theme}
              onToggle={() => toggleSection("theme")}
              badge={selectedTenant.name}
            >
              <ThemePreview tenant={selectedTenant} onEdit={editTenant} />
            </CollapsibleSection>
          ) : null}

          {selectedTenant ? (
            <CollapsibleSection
              title="Configuraciones operativas"
              description="Flujo de pedidos, Meta y política para pedidos grandes."
              isOpen={openSections.operations}
              onToggle={() => toggleSection("operations")}
              badge={selectedTenant.orderFlowMode}
            >
              <OperationsPreview tenant={selectedTenant} onEdit={editTenant} />
            </CollapsibleSection>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function ThemePreview({
  tenant,
  onEdit,
}: {
  tenant: SuperAdminTenantSummary;
  onEdit: (tenant: SuperAdminTenantSummary) => void;
}) {
  const preset = getVisualPreset(tenant.visualPresetId);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <div className="mb-5">
          <p className="text-sm font-black text-stone-950">{preset.name}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {preset.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ColorToken label="Principal" value={preset.colors.primary} />
          <ColorToken label="Secundario" value={preset.colors.secondary} />
          <ColorToken label="Acento" value={preset.colors.accent} />
          <ColorToken label="Fondo" value={preset.colors.background} />
          <ColorToken label="Tarjeta" value={preset.colors.card} />
          <ColorToken label="Texto" value={preset.colors.text} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoItem label="Preset" value={tenant.visualPresetId} />
          <InfoItem label="Estilo hero" value={preset.layout.heroStyle} />
        </div>
      </div>
      <AppButton
        onClick={() => onEdit(tenant)}
      >
        Editar diseño
      </AppButton>
    </div>
  );
}

function OperationsPreview({
  tenant,
  onEdit,
}: {
  tenant: SuperAdminTenantSummary;
  onEdit: (tenant: SuperAdminTenantSummary) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InfoItem
          label="Estado"
          value={tenant.status === "active" ? "Activo" : "Inactivo"}
        />
        <InfoItem label="Flujo" value={tenant.orderFlowMode} />
        <InfoItem
          label="Preparación"
          value={`${tenant.estimatedPreparationMinutes} min`}
        />
        <InfoItem
          label="Meta Phone Number ID"
          value={tenant.metaPhoneNumberId || "No configurado"}
        />
        <InfoItem
          label="WhatsApp activo"
          value={tenant.active ? "Activo" : "Inactivo"}
        />
        <InfoItem
          label="Meta Access Token"
          value={tenant.metaAccessToken ? "Configurado" : "No configurado"}
        />
        <InfoItem
          label="Pedidos grandes"
          value={
            tenant.orderConfirmationPolicy.enabled
              ? `Confirmar desde $${tenant.orderConfirmationPolicy.amountThreshold}`
              : "Sin confirmación manual"
          }
        />
        <InfoItem label="WhatsApp" value={tenant.whatsappPhone || "No configurado"} />
        <InfoItem
          label="Entrega"
          value={
            tenant.deliveryConfig.enabled
              ? `Activa, $${tenant.deliveryConfig.fee ?? 0}`
              : "Inactiva"
          }
        />
      </div>
      <AppButton
        onClick={() => onEdit(tenant)}
      >
        Editar configuración
      </AppButton>
    </div>
  );
}

function ColorToken({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-40 items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
      <span
        className="h-8 w-8 rounded-full ring-1 ring-stone-200"
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
          {label}
        </span>
        <span className="block truncate text-sm font-black text-stone-800">
          {value}
        </span>
      </span>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-stone-900">
        {value}
      </p>
    </div>
  );
}
