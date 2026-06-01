import type { TenantTheme, TenantThemePresetKey } from "../types/theme";

export const DEFAULT_TENANT_THEME: TenantTheme = {
  primaryColor: "#ea580c",
  secondaryColor: "#35271b",
  accentColor: "#fdba74",
  backgroundColor: "#20170f",
  surfaceColor: "#2a1f16",
  textColor: "#fff7ed",
  typography: "bold",
  visualStyle: "restaurant",
};

export const TENANT_THEME_PRESETS: Record<TenantThemePresetKey, TenantTheme> = {
  taqueria: {
    primaryColor: "#dc2626",
    secondaryColor: "#14532d",
    accentColor: "#facc15",
    backgroundColor: "#1a120b",
    surfaceColor: "#27180f",
    textColor: "#fff7ed",
    typography: "bold",
    visualStyle: "street-food",
  },
  dessert: {
    primaryColor: "#db2777",
    secondaryColor: "#7c2d12",
    accentColor: "#f9a8d4",
    backgroundColor: "#fff1f2",
    surfaceColor: "#ffffff",
    textColor: "#3b1725",
    typography: "soft",
    visualStyle: "dessert",
  },
  coffee: {
    primaryColor: "#92400e",
    secondaryColor: "#292524",
    accentColor: "#d6a85f",
    backgroundColor: "#1c1917",
    surfaceColor: "#292524",
    textColor: "#fef3c7",
    typography: "modern",
    visualStyle: "coffee",
  },
  minimal: {
    primaryColor: "#111827",
    secondaryColor: "#e5e7eb",
    accentColor: "#2563eb",
    backgroundColor: "#f8fafc",
    surfaceColor: "#ffffff",
    textColor: "#111827",
    typography: "modern",
    visualStyle: "minimal",
  },
  restaurant: {
    primaryColor: "#b45309",
    secondaryColor: "#3f3f46",
    accentColor: "#f97316",
    backgroundColor: "#18181b",
    surfaceColor: "#27272a",
    textColor: "#fafafa",
    typography: "bold",
    visualStyle: "restaurant",
  },
};

export const TENANT_THEME_PRESET_OPTIONS: Array<{
  key: TenantThemePresetKey;
  label: string;
}> = [
  { key: "taqueria", label: "Taquería" },
  { key: "dessert", label: "Crepas/Postres" },
  { key: "coffee", label: "Cafetería" },
  { key: "minimal", label: "Minimalista" },
  { key: "restaurant", label: "Restaurante" },
];
