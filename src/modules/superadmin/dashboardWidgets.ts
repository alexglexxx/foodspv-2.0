export type DashboardWidgetId =
  | "metrics"
  | "tenant-selector"
  | "quick-actions"
  | "tenant-health"
  | "recent-orders"
  | "configuration-alerts";

export interface DashboardWidget {
  id: DashboardWidgetId;
  title: string;
  description: string;
  enabledByDefault: boolean;
}

export type DashboardWidgetPreferences = Record<DashboardWidgetId, boolean>;

export const DEFAULT_SUPERADMIN_WIDGETS: DashboardWidget[] = [
  {
    id: "metrics",
    title: "Métricas generales",
    description: "Resumen global de negocios, productos y pedidos.",
    enabledByDefault: true,
  },
  {
    id: "tenant-selector",
    title: "Selector de negocio",
    description: "Buscador y panel principal para elegir el tenant activo.",
    enabledByDefault: true,
  },
  {
    id: "quick-actions",
    title: "Accesos rápidos",
    description: "Acciones frecuentes para el negocio seleccionado.",
    enabledByDefault: true,
  },
  {
    id: "tenant-health",
    title: "Salud del negocio",
    description: "Estado operativo y señales clave del tenant.",
    enabledByDefault: true,
  },
  {
    id: "recent-orders",
    title: "Pedidos recientes",
    description: "Resumen de pedidos del negocio seleccionado.",
    enabledByDefault: true,
  },
  {
    id: "configuration-alerts",
    title: "Alertas de configuración",
    description: "Pendientes que pueden impedir una operación completa.",
    enabledByDefault: true,
  },
];

export function getDefaultWidgetPreferences(): DashboardWidgetPreferences {
  return DEFAULT_SUPERADMIN_WIDGETS.reduce((preferences, widget) => {
    preferences[widget.id] = widget.enabledByDefault;
    return preferences;
  }, {} as DashboardWidgetPreferences);
}

export function normalizeWidgetPreferences(
  value: unknown
): DashboardWidgetPreferences {
  const defaults = getDefaultWidgetPreferences();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Partial<Record<DashboardWidgetId, unknown>>;

  return DEFAULT_SUPERADMIN_WIDGETS.reduce((preferences, widget) => {
    const storedValue = record[widget.id];

    preferences[widget.id] =
      typeof storedValue === "boolean" ? storedValue : defaults[widget.id];
    return preferences;
  }, {} as DashboardWidgetPreferences);
}
