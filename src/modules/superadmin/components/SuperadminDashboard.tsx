"use client";

import type { ReactNode } from "react";

import { AppButton } from "@/components/ui/AppButton";

import type { DashboardWidgetPreferences } from "../dashboardWidgets";
import type { SuperAdminTenantSummary } from "../types/superAdmin";
import { TenantList } from "./TenantList";

interface SuperadminDashboardProps {
  tenants: SuperAdminTenantSummary[];
  selectedTenant: SuperAdminTenantSummary | null;
  selectedTenantId: string | null;
  widgetPreferences: DashboardWidgetPreferences;
  isLoading: boolean;
  deletingTenantId: string | null;
  permanentlyDeletingTenantId: string | null;
  onCustomize: () => void;
  onRefresh: () => void;
  onSelectTenant: (tenant: SuperAdminTenantSummary) => void;
  onStartCreateTenant: () => void;
  onOpenWebapp: (tenant: SuperAdminTenantSummary) => void;
  onEditTenant: (tenant: SuperAdminTenantSummary) => void;
  onOpenProducts: (tenant: SuperAdminTenantSummary) => void;
  onOpenOrders: (tenant: SuperAdminTenantSummary) => void;
  onOpenTheme: (tenant: SuperAdminTenantSummary) => void;
  onOpenOperations: (tenant: SuperAdminTenantSummary) => void;
  onToggleActive: (tenant: SuperAdminTenantSummary) => void;
  onPermanentDelete: (tenantId: string) => void;
}

export function SuperadminDashboard({
  tenants,
  selectedTenant,
  selectedTenantId,
  widgetPreferences,
  isLoading,
  deletingTenantId,
  permanentlyDeletingTenantId,
  onCustomize,
  onRefresh,
  onSelectTenant,
  onStartCreateTenant,
  onOpenWebapp,
  onEditTenant,
  onOpenProducts,
  onOpenOrders,
  onOpenTheme,
  onOpenOperations,
  onToggleActive,
  onPermanentDelete,
}: SuperadminDashboardProps) {
  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-stone-950">
            Command Center
          </h2>
          <p className="mt-1 text-sm font-semibold text-stone-600">
            Widgets configurables para operar el panel global.
          </p>
        </div>
        <AppButton
          onClick={onCustomize}
          variant="secondary"
          size="sm"
          className="w-full border-orange-200 text-orange-800 hover:bg-orange-50 sm:w-auto"
        >
          ⚙ Personalizar dashboard
        </AppButton>
      </div>

      {!widgetPreferences["tenant-selector"] ? (
        <MiniTenantSelector
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          selectedTenant={selectedTenant}
          onSelectTenant={onSelectTenant}
        />
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {widgetPreferences.metrics ? (
          <SuperadminMetricsWidget tenants={tenants} />
        ) : null}

        {widgetPreferences["tenant-selector"] ? (
          <SuperadminTenantSelectorWidget
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            isLoading={isLoading}
            deletingTenantId={deletingTenantId}
            permanentlyDeletingTenantId={permanentlyDeletingTenantId}
            onRefresh={onRefresh}
            onSelect={onSelectTenant}
            onOpenWebapp={onOpenWebapp}
            onEdit={onEditTenant}
            onOpenProducts={onOpenProducts}
            onOpenOrders={onOpenOrders}
            onToggleActive={onToggleActive}
            onPermanentDelete={onPermanentDelete}
          />
        ) : null}

        {widgetPreferences["quick-actions"] ? (
          <SuperadminQuickActionsWidget
            selectedTenant={selectedTenant}
            deletingTenantId={deletingTenantId}
            onStartCreateTenant={onStartCreateTenant}
            onOpenWebapp={onOpenWebapp}
            onEditTenant={onEditTenant}
            onOpenProducts={onOpenProducts}
            onOpenOrders={onOpenOrders}
            onToggleActive={onToggleActive}
          />
        ) : null}

        {widgetPreferences["tenant-health"] ? (
          <SuperadminTenantHealthWidget
            selectedTenant={selectedTenant}
            onOpenOperations={onOpenOperations}
          />
        ) : null}

        {widgetPreferences["recent-orders"] ? (
          <SuperadminRecentOrdersWidget
            selectedTenant={selectedTenant}
            onOpenOrders={onOpenOrders}
          />
        ) : null}

        {widgetPreferences["configuration-alerts"] ? (
          <SuperadminConfigurationAlertsWidget
            selectedTenant={selectedTenant}
            onEditTenant={onEditTenant}
            onOpenTheme={onOpenTheme}
            onOpenOperations={onOpenOperations}
          />
        ) : null}
      </div>
    </section>
  );
}

function SuperadminWidgetShell({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={[
        "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm",
        className,
      ].join(" ")}
    >
      <div>
        <h3 className="text-lg font-black text-stone-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">
          {description}
        </p>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function SuperadminMetricsWidget({
  tenants,
}: {
  tenants: SuperAdminTenantSummary[];
}) {
  const activeTenants = tenants.filter(
    (tenant) => tenant.active && tenant.status === "active"
  ).length;
  const inactiveTenants = tenants.length - activeTenants;
  const productsCount = tenants.reduce(
    (total, tenant) => total + tenant.stats.productsCount,
    0
  );
  const ordersCount = tenants.reduce(
    (total, tenant) => total + tenant.stats.ordersCount,
    0
  );

  return (
    <SuperadminWidgetShell
      title="Métricas generales"
      description="Vista rápida de la operación global."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Negocios" value={tenants.length.toString()} />
        <MetricTile label="Activos" value={activeTenants.toString()} />
        <MetricTile label="Inactivos" value={inactiveTenants.toString()} />
        <MetricTile label="Productos" value={productsCount.toString()} />
      </div>
      <div className="mt-3">
        <MetricTile label="Pedidos acumulados" value={ordersCount.toString()} />
      </div>
    </SuperadminWidgetShell>
  );
}

export function SuperadminTenantSelectorWidget({
  tenants,
  selectedTenantId,
  isLoading,
  deletingTenantId,
  permanentlyDeletingTenantId,
  onRefresh,
  onSelect,
  onOpenWebapp,
  onEdit,
  onOpenProducts,
  onOpenOrders,
  onToggleActive,
  onPermanentDelete,
}: {
  tenants: SuperAdminTenantSummary[];
  selectedTenantId: string | null;
  isLoading: boolean;
  deletingTenantId: string | null;
  permanentlyDeletingTenantId: string | null;
  onRefresh: () => void;
  onSelect: (tenant: SuperAdminTenantSummary) => void;
  onOpenWebapp: (tenant: SuperAdminTenantSummary) => void;
  onEdit: (tenant: SuperAdminTenantSummary) => void;
  onOpenProducts: (tenant: SuperAdminTenantSummary) => void;
  onOpenOrders: (tenant: SuperAdminTenantSummary) => void;
  onToggleActive: (tenant: SuperAdminTenantSummary) => void;
  onPermanentDelete: (tenantId: string) => void;
}) {
  return (
    <SuperadminWidgetShell
      title="Selector de negocio"
      description="Busca y selecciona el tenant activo del dashboard."
      className="lg:col-span-2"
    >
      <TenantList
        tenants={tenants}
        selectedTenantId={selectedTenantId}
        isLoading={isLoading}
        deletingTenantId={deletingTenantId}
        permanentlyDeletingTenantId={permanentlyDeletingTenantId}
        onRefresh={onRefresh}
        onSelect={onSelect}
        onOpenWebapp={onOpenWebapp}
        onEdit={onEdit}
        onOpenProducts={onOpenProducts}
        onOpenOrders={onOpenOrders}
        onToggleActive={onToggleActive}
        onPermanentDelete={onPermanentDelete}
      />
    </SuperadminWidgetShell>
  );
}

export function SuperadminQuickActionsWidget({
  selectedTenant,
  deletingTenantId,
  onStartCreateTenant,
  onOpenWebapp,
  onEditTenant,
  onOpenProducts,
  onOpenOrders,
  onToggleActive,
}: {
  selectedTenant: SuperAdminTenantSummary | null;
  deletingTenantId: string | null;
  onStartCreateTenant: () => void;
  onOpenWebapp: (tenant: SuperAdminTenantSummary) => void;
  onEditTenant: (tenant: SuperAdminTenantSummary) => void;
  onOpenProducts: (tenant: SuperAdminTenantSummary) => void;
  onOpenOrders: (tenant: SuperAdminTenantSummary) => void;
  onToggleActive: (tenant: SuperAdminTenantSummary) => void;
}) {
  const selectedTenantIsActive =
    selectedTenant !== null &&
    selectedTenant.active &&
    selectedTenant.status === "active";

  return (
    <SuperadminWidgetShell
      title="Accesos rápidos"
      description="Atajos principales del negocio seleccionado."
    >
      <div className="grid grid-cols-2 gap-2">
        <AppButton onClick={onStartCreateTenant} className="w-full">
          Crear negocio
        </AppButton>
        <DashboardActionButton
          disabled={!selectedTenant}
          onClick={() => selectedTenant && onOpenWebapp(selectedTenant)}
        >
          Abrir webapp
        </DashboardActionButton>
        <DashboardActionButton
          disabled={!selectedTenant}
          onClick={() => selectedTenant && onEditTenant(selectedTenant)}
        >
          Editar
        </DashboardActionButton>
        <DashboardActionButton
          disabled={!selectedTenant}
          onClick={() => selectedTenant && onOpenProducts(selectedTenant)}
        >
          Productos
        </DashboardActionButton>
        <DashboardActionButton
          disabled={!selectedTenant}
          onClick={() => selectedTenant && onOpenOrders(selectedTenant)}
        >
          Pedidos
        </DashboardActionButton>
        <AppButton
          onClick={() => selectedTenant && onToggleActive(selectedTenant)}
          disabled={!selectedTenant}
          loading={
            selectedTenant !== null && deletingTenantId === selectedTenant.tenantId
          }
          loadingText={selectedTenantIsActive ? "Desactivando..." : "Activando..."}
          variant={selectedTenantIsActive ? "danger" : "secondary"}
          className="w-full"
        >
          {selectedTenantIsActive ? "Desactivar" : "Activar"}
        </AppButton>
      </div>
    </SuperadminWidgetShell>
  );
}

export function SuperadminTenantHealthWidget({
  selectedTenant,
  onOpenOperations,
}: {
  selectedTenant: SuperAdminTenantSummary | null;
  onOpenOperations: (tenant: SuperAdminTenantSummary) => void;
}) {
  if (!selectedTenant) {
    return (
      <SuperadminWidgetShell
        title="Salud del negocio"
        description="Selecciona un negocio para ver su estado."
      >
        <EmptyWidgetText />
      </SuperadminWidgetShell>
    );
  }

  const hasWhatsApp = hasCompleteWhatsAppConfiguration(selectedTenant);
  const activeProducts = selectedTenant.stats.activeProductsCount;
  const isActive = selectedTenant.active && selectedTenant.status === "active";

  return (
    <SuperadminWidgetShell
      title="Salud del negocio"
      description={selectedTenant.name}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <HealthPill label="Estado" value={isActive ? "Activo" : "Inactivo"} />
        <HealthPill
          label="WhatsApp"
          value={hasWhatsApp ? "Configurado" : "Pendiente"}
        />
        <HealthPill label="Productos activos" value={activeProducts.toString()} />
      </div>
      <AppButton
        onClick={() => onOpenOperations(selectedTenant)}
        variant="secondary"
        className="mt-4 w-full"
      >
        Revisar operación
      </AppButton>
    </SuperadminWidgetShell>
  );
}

export function SuperadminRecentOrdersWidget({
  selectedTenant,
  onOpenOrders,
}: {
  selectedTenant: SuperAdminTenantSummary | null;
  onOpenOrders: (tenant: SuperAdminTenantSummary) => void;
}) {
  if (!selectedTenant) {
    return (
      <SuperadminWidgetShell
        title="Pedidos recientes"
        description="Selecciona un negocio para ver pedidos."
      >
        <EmptyWidgetText />
      </SuperadminWidgetShell>
    );
  }

  return (
    <SuperadminWidgetShell
      title="Pedidos recientes"
      description={selectedTenant.name}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Pedidos"
          value={selectedTenant.stats.ordersCount.toString()}
        />
        <MetricTile
          label="Pendientes"
          value={selectedTenant.stats.pendingOrdersCount.toString()}
        />
        <MetricTile
          label="Ventas"
          value={formatCurrency(selectedTenant.stats.totalSales)}
        />
      </div>
      <AppButton
        onClick={() => onOpenOrders(selectedTenant)}
        variant="secondary"
        className="mt-4 w-full"
      >
        Abrir pedidos
      </AppButton>
    </SuperadminWidgetShell>
  );
}

export function SuperadminConfigurationAlertsWidget({
  selectedTenant,
  onEditTenant,
  onOpenTheme,
  onOpenOperations,
}: {
  selectedTenant: SuperAdminTenantSummary | null;
  onEditTenant: (tenant: SuperAdminTenantSummary) => void;
  onOpenTheme: (tenant: SuperAdminTenantSummary) => void;
  onOpenOperations: (tenant: SuperAdminTenantSummary) => void;
}) {
  if (!selectedTenant) {
    return (
      <SuperadminWidgetShell
        title="Alertas de configuración"
        description="Selecciona un negocio para revisar pendientes."
      >
        <EmptyWidgetText />
      </SuperadminWidgetShell>
    );
  }

  const alerts = getConfigurationAlerts(selectedTenant);

  return (
    <SuperadminWidgetShell
      title="Alertas de configuración"
      description={selectedTenant.name}
    >
      {alerts.length === 0 ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
          Sin pendientes críticos.
        </p>
      ) : (
        <div className="grid gap-2">
          {alerts.map((alert) => (
            <div
              key={alert.label}
              className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 ring-1 ring-rose-100"
            >
              {alert.label}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <AppButton
          onClick={() => onEditTenant(selectedTenant)}
          variant="secondary"
          className="w-full"
        >
          Editar negocio
        </AppButton>
        <AppButton
          onClick={() => onOpenOperations(selectedTenant)}
          variant="secondary"
          className="w-full"
        >
          Operación
        </AppButton>
        <AppButton
          onClick={() => onOpenTheme(selectedTenant)}
          variant="secondary"
          className="col-span-2 w-full"
        >
          Diseño visual
        </AppButton>
      </div>
    </SuperadminWidgetShell>
  );
}

function MiniTenantSelector({
  tenants,
  selectedTenantId,
  selectedTenant,
  onSelectTenant,
}: {
  tenants: SuperAdminTenantSummary[];
  selectedTenantId: string | null;
  selectedTenant: SuperAdminTenantSummary | null;
  onSelectTenant: (tenant: SuperAdminTenantSummary) => void;
}) {
  function handleSelectTenant(tenantId: string): void {
    const tenant = tenants.find((candidate) => candidate.tenantId === tenantId);

    if (tenant) {
      onSelectTenant(tenant);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
          Negocio seleccionado
        </span>
        <select
          value={selectedTenantId ?? ""}
          onChange={(event) => handleSelectTenant(event.target.value)}
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-extrabold text-stone-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
        >
          <option value="" disabled>
            Seleccionar negocio
          </option>
          {tenants.map((tenant) => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.name}
            </option>
          ))}
        </select>
      </label>
      {selectedTenant ? (
        <p className="mt-2 text-xs font-semibold text-stone-500">
          {selectedTenant.tenantId} · {selectedTenant.category}
        </p>
      ) : null}
    </div>
  );
}

function DashboardActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <AppButton
      onClick={onClick}
      disabled={disabled}
      variant="secondary"
      className="w-full"
    >
      {children}
    </AppButton>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
    </div>
  );
}

function HealthPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-stone-950">
        {value}
      </p>
    </div>
  );
}

function EmptyWidgetText() {
  return (
    <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
      No hay negocio seleccionado.
    </p>
  );
}

function hasCompleteWhatsAppConfiguration(
  tenant: SuperAdminTenantSummary
): boolean {
  return (
    tenant.whatsappPhone.trim().length > 0 &&
    tenant.metaPhoneNumberId.trim().length > 0 &&
    tenant.metaAccessToken.trim().length > 0
  );
}

function getConfigurationAlerts(
  tenant: SuperAdminTenantSummary
): Array<{ label: string }> {
  const alerts: Array<{ label: string }> = [];

  if (!tenant.active || tenant.status !== "active") {
    alerts.push({ label: "El negocio está inactivo." });
  }

  if (!hasCompleteWhatsAppConfiguration(tenant)) {
    alerts.push({ label: "Falta completar la configuración de WhatsApp/Meta." });
  }

  if (tenant.stats.productsCount === 0) {
    alerts.push({ label: "No hay productos registrados." });
  }

  if (tenant.heroImageUrl.trim().length === 0) {
    alerts.push({ label: "Falta imagen hero para el menú público." });
  }

  if (!tenant.orderConfirmationPolicy.enabled) {
    alerts.push({ label: "Pedidos grandes no requieren confirmación manual." });
  }

  return alerts;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
