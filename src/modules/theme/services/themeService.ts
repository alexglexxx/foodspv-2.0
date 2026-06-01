import { DEFAULT_TENANT_THEME } from "../constants/themePresets";
import type {
  TenantTheme,
  TenantThemeTypography,
  TenantThemeVisualStyle,
} from "../types/theme";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const TENANT_THEME_TYPOGRAPHIES: readonly TenantThemeTypography[] = [
  "modern",
  "bold",
  "soft",
];

const TENANT_THEME_VISUAL_STYLES: readonly TenantThemeVisualStyle[] = [
  "street-food",
  "dessert",
  "minimal",
  "coffee",
  "restaurant",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const color = value.trim();

  return HEX_COLOR_PATTERN.test(color) ? color.toLowerCase() : fallback;
}

function normalizeTypography(value: unknown): TenantThemeTypography {
  return typeof value === "string" &&
    TENANT_THEME_TYPOGRAPHIES.includes(value as TenantThemeTypography)
    ? (value as TenantThemeTypography)
    : DEFAULT_TENANT_THEME.typography;
}

function normalizeVisualStyle(value: unknown): TenantThemeVisualStyle {
  return typeof value === "string" &&
    TENANT_THEME_VISUAL_STYLES.includes(value as TenantThemeVisualStyle)
    ? (value as TenantThemeVisualStyle)
    : DEFAULT_TENANT_THEME.visualStyle;
}

export function normalizeTenantTheme(value: unknown): TenantTheme {
  if (!isRecord(value)) {
    return DEFAULT_TENANT_THEME;
  }

  return {
    primaryColor: normalizeColor(
      value.primaryColor,
      DEFAULT_TENANT_THEME.primaryColor
    ),
    secondaryColor: normalizeColor(
      value.secondaryColor,
      DEFAULT_TENANT_THEME.secondaryColor
    ),
    accentColor: normalizeColor(value.accentColor, DEFAULT_TENANT_THEME.accentColor),
    backgroundColor: normalizeColor(
      value.backgroundColor,
      DEFAULT_TENANT_THEME.backgroundColor
    ),
    surfaceColor: normalizeColor(
      value.surfaceColor,
      DEFAULT_TENANT_THEME.surfaceColor
    ),
    textColor: normalizeColor(value.textColor, DEFAULT_TENANT_THEME.textColor),
    typography: normalizeTypography(value.typography),
    visualStyle: normalizeVisualStyle(value.visualStyle),
  };
}

export function getTenantThemeCssVariables(
  themeInput: unknown
): Record<string, string> {
  const theme = normalizeTenantTheme(themeInput);

  return {
    "--tenant-primary": theme.primaryColor,
    "--tenant-primary-hover": theme.accentColor,
    "--tenant-secondary": theme.secondaryColor,
    "--tenant-accent": theme.accentColor,
    "--tenant-background": theme.backgroundColor,
    "--tenant-surface": theme.surfaceColor,
    "--tenant-text": theme.textColor,
    "--tenant-muted": "color-mix(in srgb, var(--tenant-text) 72%, transparent)",
    "--tenant-subtle": "color-mix(in srgb, var(--tenant-surface) 82%, var(--tenant-background))",
    "--tenant-ring": "color-mix(in srgb, var(--tenant-secondary) 72%, var(--tenant-text) 16%)",
  };
}

export function isValidTenantTheme(value: unknown): value is TenantTheme {
  if (!isRecord(value)) {
    return false;
  }

  const theme = normalizeTenantTheme(value);

  return (
    theme.primaryColor === value.primaryColor &&
    theme.secondaryColor === value.secondaryColor &&
    theme.accentColor === value.accentColor &&
    theme.backgroundColor === value.backgroundColor &&
    theme.surfaceColor === value.surfaceColor &&
    theme.textColor === value.textColor &&
    theme.typography === value.typography &&
    theme.visualStyle === value.visualStyle
  );
}
