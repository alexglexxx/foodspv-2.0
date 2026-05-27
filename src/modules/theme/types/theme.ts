export type TenantThemeTypography = "modern" | "bold" | "soft";

export type TenantThemeVisualStyle =
  | "street-food"
  | "dessert"
  | "minimal"
  | "coffee"
  | "restaurant";

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  typography: TenantThemeTypography;
  visualStyle: TenantThemeVisualStyle;
}

export type TenantThemePresetKey =
  | "taqueria"
  | "dessert"
  | "coffee"
  | "minimal"
  | "restaurant";
