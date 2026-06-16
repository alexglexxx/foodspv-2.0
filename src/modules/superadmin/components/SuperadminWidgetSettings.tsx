"use client";

import { AppButton } from "@/components/ui/AppButton";

import {
  DEFAULT_SUPERADMIN_WIDGETS,
  type DashboardWidgetId,
  type DashboardWidgetPreferences,
} from "../dashboardWidgets";

interface SuperadminWidgetSettingsProps {
  draftPreferences: DashboardWidgetPreferences;
  onChange: (preferences: DashboardWidgetPreferences) => void;
  onSave: () => void;
  onRestoreDefault: () => void;
  onClose: () => void;
}

export function SuperadminWidgetSettings({
  draftPreferences,
  onChange,
  onSave,
  onRestoreDefault,
  onClose,
}: SuperadminWidgetSettingsProps) {
  function toggleWidget(widgetId: DashboardWidgetId): void {
    onChange({
      ...draftPreferences,
      [widgetId]: !draftPreferences[widgetId],
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-stone-950/40 px-4 py-4 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="superadmin-widget-settings-title"
    >
      <section className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-stone-200 sm:max-w-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="superadmin-widget-settings-title"
              className="text-xl font-black text-stone-950"
            >
              Personalizar dashboard
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">
              Activa u oculta los módulos del Command Center.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg font-black text-stone-700 transition hover:bg-stone-200"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {DEFAULT_SUPERADMIN_WIDGETS.map((widget) => {
            const isEnabled = draftPreferences[widget.id];

            return (
              <label
                key={widget.id}
                className="flex min-h-[72px] cursor-pointer items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-stone-950">
                    {widget.title}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-stone-500">
                    {widget.description}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleWidget(widget.id)}
                  className="h-7 w-7 shrink-0 accent-orange-700"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <AppButton onClick={onSave} className="w-full">
            Guardar
          </AppButton>
          <AppButton
            onClick={onRestoreDefault}
            variant="secondary"
            className="w-full"
          >
            Restaurar predeterminado
          </AppButton>
          <AppButton onClick={onClose} variant="ghost" className="w-full">
            Cerrar
          </AppButton>
        </div>
      </section>
    </div>
  );
}
