export type TenantVisualPresetId = "fresh" | "dark-premium" | "modern";

export type TenantVisualPreset = {
  id: TenantVisualPresetId;
  name: string;
  tagline: string;
  description: string;

  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    mutedText: string;
    buttonText: string;
    border: string;
    heroOverlay: string;
  };

  layout: {
    radius: string;
    cardShadow: string;
    heroStyle: "clean" | "cinematic" | "minimal";
    density: "comfortable" | "compact" | "spacious";
  };
};

export const VISUAL_PRESETS = [
  {
    id: "fresh",
    name: "Fresh",
    tagline: "Fresco, rápido y móvil",
    description:
      "Una experiencia luminosa tipo app de delivery, ideal para comida fresca y menús de alto volumen.",
    colors: {
      primary: "#06C167",
      secondary: "#111827",
      accent: "#22C55E",
      background: "#F5F6F7",
      surface: "#FFFFFF",
      card: "#FFFFFF",
      text: "#111827",
      mutedText: "#6B7280",
      buttonText: "#FFFFFF",
      border: "#E5E7EB",
      heroOverlay:
        "linear-gradient(180deg, rgba(17,24,39,0.10), rgba(17,24,39,0.55))",
    },
    layout: {
      radius: "20px",
      cardShadow: "0 18px 45px rgba(15, 23, 42, 0.10)",
      heroStyle: "clean",
      density: "comfortable",
    },
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    tagline: "Nocturno, intenso y premium",
    description:
      "Un look cinematográfico para restaurantes con foto protagonista, burgers, grill y experiencias de noche.",
    colors: {
      primary: "#FF7A00",
      secondary: "#0F1115",
      accent: "#FDBA74",
      background: "#0F1115",
      surface: "#1B1F27",
      card: "#171A21",
      text: "#FFFFFF",
      mutedText: "#B8BDC7",
      buttonText: "#111827",
      border: "#2A2F3A",
      heroOverlay:
        "linear-gradient(180deg, rgba(15,17,21,0.20), rgba(15,17,21,0.88))",
    },
    layout: {
      radius: "16px",
      cardShadow: "0 22px 60px rgba(0, 0, 0, 0.45)",
      heroStyle: "cinematic",
      density: "comfortable",
    },
  },
  {
    id: "modern",
    name: "Modern",
    tagline: "Limpio, minimalista y actual",
    description:
      "Una apariencia moderna y sobria para cafeterías, comida rápida contemporánea y negocios con estética SaaS.",
    colors: {
      primary: "#2563EB",
      secondary: "#0F172A",
      accent: "#DBEAFE",
      background: "#F8FAFC",
      surface: "#FFFFFF",
      card: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#64748B",
      buttonText: "#FFFFFF",
      border: "#E2E8F0",
      heroOverlay:
        "linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.48))",
    },
    layout: {
      radius: "14px",
      cardShadow: "0 16px 40px rgba(37, 99, 235, 0.10)",
      heroStyle: "minimal",
      density: "spacious",
    },
  },
] satisfies TenantVisualPreset[];

export function isValidVisualPresetId(
  presetId: unknown
): presetId is TenantVisualPresetId {
  return (
    typeof presetId === "string" &&
    VISUAL_PRESETS.some((preset) => preset.id === presetId)
  );
}

export function getVisualPreset(presetId?: string): TenantVisualPreset {
  return (
    VISUAL_PRESETS.find((preset) => preset.id === presetId) ??
    VISUAL_PRESETS[0]
  );
}
