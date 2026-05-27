import { TENANT_THEME_PRESETS } from "../constants/themePresets";
import type { TenantTheme } from "../types/theme";

function normalizeCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function generateThemeFromCategory(category: string): TenantTheme {
  const normalizedCategory = normalizeCategory(category);

  if (
    normalizedCategory.includes("taco") ||
    normalizedCategory.includes("taquer") ||
    normalizedCategory.includes("antojito")
  ) {
    return TENANT_THEME_PRESETS.taqueria;
  }

  if (
    normalizedCategory.includes("crepa") ||
    normalizedCategory.includes("postre") ||
    normalizedCategory.includes("helado") ||
    normalizedCategory.includes("pastel")
  ) {
    return TENANT_THEME_PRESETS.dessert;
  }

  if (
    normalizedCategory.includes("cafe") ||
    normalizedCategory.includes("cafeteria") ||
    normalizedCategory.includes("coffee")
  ) {
    return TENANT_THEME_PRESETS.coffee;
  }

  if (
    normalizedCategory.includes("minimal") ||
    normalizedCategory.includes("saludable")
  ) {
    return TENANT_THEME_PRESETS.minimal;
  }

  return TENANT_THEME_PRESETS.restaurant;
}
