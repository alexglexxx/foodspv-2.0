"use client";

import { useMemo, useState } from "react";

import { AppButton } from "@/components/ui/AppButton";

import type {
  SuperAdminTenantStatus,
  SuperAdminTenantSummary,
} from "../types/superAdmin";

type TenantFilter = "all" | "active" | "inactive" | "incomplete";

interface TenantListProps {
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
}

const TENANT_FILTERS: Array<{ value: TenantFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "incomplete", label: "Configuración incompleta" },
];

function getStatusClassName(status: SuperAdminTenantStatus): string {
  return status === "active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-stone-100 text-stone-600 ring-stone-200";
}

function isTenantActive(tenant: SuperAdminTenantSummary): boolean {
  return tenant.active && tenant.status === "active";
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

function matchesFilter(
  tenant: SuperAdminTenantSummary,
  filter: TenantFilter
): boolean {
  if (filter === "active") {
    return isTenantActive(tenant);
  }

  if (filter === "inactive") {
    return !isTenantActive(tenant);
  }

  if (filter === "incomplete") {
    return !hasCompleteWhatsAppConfiguration(tenant);
  }

  return true;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function getTenantSearchText(tenant: SuperAdminTenantSummary): string {
  return [tenant.name, tenant.tenantId, tenant.category, tenant.featuredCategory]
    .join(" ")
    .toLowerCase();
}

export function TenantList({
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
}: TenantListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<TenantFilter>("all");

  const selectedTenant =
    selectedTenantId !== null
      ? tenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null
      : null;

  const filteredTenants = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery);

    return tenants.filter((tenant) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        getTenantSearchText(tenant).includes(normalizedQuery);

      return matchesSearch && matchesFilter(tenant, activeFilter);
    });
  }, [activeFilter, searchQuery, tenants]);

  const selectedTenantIsBusy =
    selectedTenant !== null &&
    (deletingTenantId === selectedTenant.tenantId ||
      permanentlyDeletingTenantId === selectedTenant.tenantId);
  const selectedTenantIsActive =
    selectedTenant !== null ? isTenantActive(selectedTenant) : false;
  const selectedTenantIsInFilteredResults =
    selectedTenantId !== null &&
    filteredTenants.some((tenant) => tenant.tenantId === selectedTenantId);

  function handleSelectTenant(tenantId: string): void {
    const tenant = tenants.find((candidate) => candidate.tenantId === tenantId);

    if (tenant) {
      onSelect(tenant);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-stone-950">
            {tenants.length} negocios registrados
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">
            Selecciona un negocio para administrar sus productos, pedidos y
            configuración.
          </p>
        </div>
        <AppButton
          onClick={onRefresh}
          loading={isLoading}
          loadingText="Cargando..."
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
        >
          Actualizar
        </AppButton>
      </div>

      {isLoading ? (
        <p className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-500">
          Cargando negocios...
        </p>
      ) : null}

      {!isLoading && tenants.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
          No hay negocios registrados.
        </p>
      ) : null}

      {tenants.length > 0 ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:items-start">
          <section className="grid gap-3">
            <label className="block">
              <span className="sr-only">Buscar negocio</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar negocio..."
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="sr-only">Selector de negocio</span>
              <select
                value={
                  selectedTenantIsInFilteredResults ? selectedTenantId ?? "" : ""
                }
                onChange={(event) => handleSelectTenant(event.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-extrabold text-stone-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              >
                <option value="" disabled>
                  Seleccionar negocio
                </option>
                {filteredTenants.map((tenant) => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos">
              {TENANT_FILTERS.map((filter) => {
                const isActive = filter.value === activeFilter;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={[
                      "min-h-[38px] rounded-full px-3 text-xs font-extrabold transition",
                      isActive
                        ? "bg-orange-700 text-white"
                        : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {!isLoading && filteredTenants.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm font-semibold text-stone-500">
                Sin resultados.
              </p>
            ) : null}

            {filteredTenants.length > 0 ? (
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-stone-200 bg-white">
                {filteredTenants.map((tenant) => {
                  const isSelected = tenant.tenantId === selectedTenantId;
                  const tenantIsActive = isTenantActive(tenant);

                  return (
                    <button
                      key={tenant.tenantId}
                      type="button"
                      onClick={() => onSelect(tenant)}
                      className={[
                        "flex w-full items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 text-left last:border-b-0",
                        isSelected ? "bg-orange-50" : "bg-white hover:bg-stone-50",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-stone-950">
                          {tenant.name}
                        </span>
                        <span className="block truncate text-xs font-semibold text-stone-500">
                          {tenant.tenantId} · {tenant.category}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold ring-1 ${getStatusClassName(
                          tenantIsActive ? "active" : "inactive"
                        )}`}
                      >
                        {tenantIsActive ? "Activo" : "Inactivo"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {selectedTenant ? (
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
                      Nombre
                    </p>
                    <h3 className="mt-1 truncate text-2xl font-black text-stone-950">
                      {selectedTenant.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-stone-600">
                      {selectedTenant.tenantId} · {selectedTenant.category}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${getStatusClassName(
                      selectedTenantIsActive ? "active" : "inactive"
                    )}`}
                  >
                    {selectedTenantIsActive ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <TenantDetail label="Estado" value={selectedTenantIsActive ? "Activo" : "Inactivo"} />
                  <TenantDetail label="Slug" value={selectedTenant.tenantId} />
                  <TenantDetail label="Categoría" value={selectedTenant.category} />
                  <TenantDetail
                    label="Configuración"
                    value={
                      hasCompleteWhatsAppConfiguration(selectedTenant)
                        ? "Completa"
                        : "Incompleta"
                    }
                  />
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <AppButton
                    onClick={() => onOpenWebapp(selectedTenant)}
                    className="w-full"
                  >
                    Abrir webapp
                  </AppButton>
                  <AppButton
                    onClick={() => onEdit(selectedTenant)}
                    variant="secondary"
                    className="w-full"
                  >
                    Editar negocio
                  </AppButton>
                  <AppButton
                    onClick={() => onOpenProducts(selectedTenant)}
                    variant="secondary"
                    className="w-full"
                  >
                    Productos
                  </AppButton>
                  <AppButton
                    onClick={() => onOpenOrders(selectedTenant)}
                    variant="secondary"
                    className="w-full"
                  >
                    Pedidos
                  </AppButton>
                  <AppButton
                    onClick={() => onToggleActive(selectedTenant)}
                    disabled={selectedTenantIsBusy}
                    loading={deletingTenantId === selectedTenant.tenantId}
                    loadingText={
                      selectedTenantIsActive ? "Desactivando..." : "Activando..."
                    }
                    variant={selectedTenantIsActive ? "danger" : "secondary"}
                    className="w-full"
                  >
                    {selectedTenantIsActive ? "Desactivar" : "Activar"}
                  </AppButton>
                  <AppButton
                    onClick={() => onPermanentDelete(selectedTenant.tenantId)}
                    disabled={selectedTenantIsBusy}
                    loading={
                      permanentlyDeletingTenantId === selectedTenant.tenantId
                    }
                    loadingText="Eliminando..."
                    variant="danger"
                    className="w-full bg-white"
                  >
                    Eliminar
                  </AppButton>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
                Selecciona un negocio para ver el panel.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function TenantDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-stone-900">
        {value}
      </p>
    </div>
  );
}
