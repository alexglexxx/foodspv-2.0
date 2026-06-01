"use client";

import type { SuperAdminTenantSummary } from "../types/superAdmin";

interface TenantAccessCardProps {
  tenant: SuperAdminTenantSummary;
  onCopyUrl: (tenant: SuperAdminTenantSummary) => void;
  onDownloadQr: (tenant: SuperAdminTenantSummary) => void;
}

export function TenantAccessCard({
  tenant,
  onCopyUrl,
  onDownloadQr,
}: TenantAccessCardProps) {
  return (
    <article className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">
            Acceso público
          </p>
          <h3 className="mt-1 text-lg font-black text-stone-950">
            {tenant.name}
          </h3>
          <p className="mt-2 break-all text-sm font-bold leading-6 text-stone-700">
            {tenant.publicUrl || "URL pública no configurada"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopyUrl(tenant)}
              disabled={!tenant.publicUrl}
              className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-extrabold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copiar URL
            </button>
            <button
              type="button"
              onClick={() => onDownloadQr(tenant)}
              disabled={!tenant.qrCode}
              className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-extrabold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Descargar QR
            </button>
          </div>
        </div>

        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-orange-100">
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
  );
}
