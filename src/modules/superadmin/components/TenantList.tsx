"use client";

import type {
  SuperAdminTenantStatus,
  SuperAdminTenantSummary,
} from "../types/superAdmin";

interface TenantListProps {
  tenants: SuperAdminTenantSummary[];
  selectedTenantId: string | null;
  isLoading: boolean;
  deletingTenantId: string | null;
  onRefresh: () => void;
  onSelect: (tenant: SuperAdminTenantSummary) => void;
  onEdit: (tenant: SuperAdminTenantSummary) => void;
  onDeactivate: (tenantId: string) => void;
}

function getStatusClassName(status: SuperAdminTenantStatus): string {
  return status === "active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-stone-100 text-stone-600 ring-stone-200";
}

export function TenantList({
  tenants,
  selectedTenantId,
  isLoading,
  deletingTenantId,
  onRefresh,
  onSelect,
  onEdit,
  onDeactivate,
}: TenantListProps) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold leading-6 text-stone-500">
          Lista compacta para seleccionar el negocio que quieres administrar.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Cargando..." : "Actualizar"}
        </button>
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

      <div className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200">
        {tenants.map((tenant) => {
          const isSelected = tenant.tenantId === selectedTenantId;

          return (
            <article
              key={tenant.tenantId}
              className={
                isSelected
                  ? "bg-orange-50/70 px-4 py-4"
                  : "bg-white px-4 py-4"
              }
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-stone-950">
                      {tenant.name}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${getStatusClassName(
                        tenant.status
                      )}`}
                    >
                      {tenant.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-stone-500">
                    {tenant.tenantId} · {tenant.category || "Sin categoría"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(tenant)}
                    className="rounded-full bg-orange-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-orange-800"
                  >
                    Seleccionar
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(tenant)}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeactivate(tenant.tenantId)}
                    disabled={deletingTenantId === tenant.tenantId}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingTenantId === tenant.tenantId
                      ? "Desactivando..."
                      : "Desactivar"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
