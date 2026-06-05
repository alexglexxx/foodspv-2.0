export type TenantCategory =
  | "tacos"
  | "hamburguesas"
  | "postres"
  | "mariscos"
  | "cafeteria"
  | "generico";

export type TenantDesignPreset = {
  id: string;
  name: string;
  category: TenantCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  textColor: string;
  mutedTextColor: string;
  buttonTextColor: string;
  heroOverlay: string;
  borderRadius: "soft" | "medium" | "large";
  fontMood: "classic" | "modern" | "warm" | "premium";
};

export const DESIGN_PRESETS_BY_CATEGORY = {
  tacos: [
    {
      id: "tacos-clasico",
      name: "Tacos Clasico",
      category: "tacos",
      description: "Rojo taqueria, crema calida y verde cilantro para taquerias tradicionales.",
      primaryColor: "#b91c1c",
      secondaryColor: "#fff7ed",
      accentColor: "#15803d",
      backgroundColor: "#fff7ed",
      surfaceColor: "#ffffff",
      cardColor: "#ffedd5",
      textColor: "#1c1917",
      mutedTextColor: "#57534e",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(28,25,23,0.92) 0%, rgba(185,28,28,0.72) 52%, rgba(21,128,61,0.3) 100%)",
      borderRadius: "medium",
      fontMood: "classic",
    },
    {
      id: "tacos-nocturno",
      name: "Tacos Nocturno",
      category: "tacos",
      description: "Carbon, naranja fuego y amarillo maiz para servicio nocturno con alto contraste.",
      primaryColor: "#f97316",
      secondaryColor: "#27272a",
      accentColor: "#fde047",
      backgroundColor: "#11100d",
      surfaceColor: "#1f1b16",
      cardColor: "#29231d",
      textColor: "#fafaf9",
      mutedTextColor: "#d6d3d1",
      buttonTextColor: "#11100d",
      heroOverlay:
        "linear-gradient(90deg, rgba(17,16,13,0.98) 0%, rgba(39,39,42,0.88) 50%, rgba(249,115,22,0.38) 100%)",
      borderRadius: "large",
      fontMood: "modern",
    },
    {
      id: "tacos-maiz",
      name: "Tacos Maiz",
      category: "tacos",
      description: "Amarillo tortilla, verde salsa y blanco calido para un menu fresco y luminoso.",
      primaryColor: "#ca8a04",
      secondaryColor: "#fef3c7",
      accentColor: "#16a34a",
      backgroundColor: "#fffbeb",
      surfaceColor: "#ffffff",
      cardColor: "#fef3c7",
      textColor: "#1f2937",
      mutedTextColor: "#57534e",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(31,41,55,0.9) 0%, rgba(202,138,4,0.66) 50%, rgba(22,163,74,0.26) 100%)",
      borderRadius: "soft",
      fontMood: "warm",
    },
  ],
  hamburguesas: [
    {
      id: "burger-americana",
      name: "Burger Americana",
      category: "hamburguesas",
      description: "Rojo diner, amarillo mostaza y blanco limpio para hamburguesas familiares.",
      primaryColor: "#dc2626",
      secondaryColor: "#ffffff",
      accentColor: "#facc15",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      cardColor: "#fee2e2",
      textColor: "#111827",
      mutedTextColor: "#4b5563",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(17,24,39,0.9) 0%, rgba(220,38,38,0.68) 52%, rgba(250,204,21,0.28) 100%)",
      borderRadius: "medium",
      fontMood: "classic",
    },
    {
      id: "burger-dark-grill",
      name: "Burger Dark Grill",
      category: "hamburguesas",
      description: "Negro carbon, naranja brasa y gris acero para burgers urbanas.",
      primaryColor: "#f97316",
      secondaryColor: "#18181b",
      accentColor: "#fb923c",
      backgroundColor: "#09090b",
      surfaceColor: "#18181b",
      cardColor: "#27272a",
      textColor: "#fafafa",
      mutedTextColor: "#d4d4d8",
      buttonTextColor: "#111827",
      heroOverlay:
        "linear-gradient(90deg, rgba(9,9,11,0.98) 0%, rgba(24,24,27,0.9) 50%, rgba(249,115,22,0.36) 100%)",
      borderRadius: "soft",
      fontMood: "modern",
    },
    {
      id: "burger-mostaza",
      name: "Burger Mostaza",
      category: "hamburguesas",
      description: "Mostaza, cafe pan y crema para hamburguesas artesanales con tono calido.",
      primaryColor: "#ca8a04",
      secondaryColor: "#78350f",
      accentColor: "#ef4444",
      backgroundColor: "#fef3c7",
      surfaceColor: "#fff7ed",
      cardColor: "#ffffff",
      textColor: "#292524",
      mutedTextColor: "#57534e",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(120,53,15,0.92) 0%, rgba(202,138,4,0.7) 52%, rgba(239,68,68,0.24) 100%)",
      borderRadius: "large",
      fontMood: "warm",
    },
  ],
  postres: [
    {
      id: "postres-rosa-crema",
      name: "Postres Rosa Crema",
      category: "postres",
      description: "Rosa suave, crema y chocolate ligero para reposteria delicada.",
      primaryColor: "#db2777",
      secondaryColor: "#fff1f2",
      accentColor: "#854d0e",
      backgroundColor: "#fff1f2",
      surfaceColor: "#ffffff",
      cardColor: "#ffe4e6",
      textColor: "#3b1725",
      mutedTextColor: "#7f1d1d",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(131,24,67,0.9) 0%, rgba(219,39,119,0.62) 52%, rgba(255,241,242,0.34) 100%)",
      borderRadius: "large",
      fontMood: "warm",
    },
    {
      id: "postres-chocolate",
      name: "Postres Chocolate",
      category: "postres",
      description: "Cafe cacao, dorado y crema para postres premium y vitrinas elegantes.",
      primaryColor: "#92400e",
      secondaryColor: "#431407",
      accentColor: "#fbbf24",
      backgroundColor: "#1c0f0a",
      surfaceColor: "#2a1710",
      cardColor: "#3b2218",
      textColor: "#fff7ed",
      mutedTextColor: "#fed7aa",
      buttonTextColor: "#fff7ed",
      heroOverlay:
        "linear-gradient(90deg, rgba(28,15,10,0.98) 0%, rgba(67,20,7,0.88) 48%, rgba(251,191,36,0.22) 100%)",
      borderRadius: "medium",
      fontMood: "premium",
    },
    {
      id: "postres-vainilla",
      name: "Postres Vainilla",
      category: "postres",
      description: "Vainilla, lila suave y rosa claro para una marca dulce y luminosa.",
      primaryColor: "#a855f7",
      secondaryColor: "#fef3c7",
      accentColor: "#fb7185",
      backgroundColor: "#fffbeb",
      surfaceColor: "#ffffff",
      cardColor: "#f5f3ff",
      textColor: "#312e81",
      mutedTextColor: "#6b7280",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(49,46,129,0.9) 0%, rgba(168,85,247,0.58) 50%, rgba(251,113,133,0.24) 100%)",
      borderRadius: "large",
      fontMood: "modern",
    },
  ],
  mariscos: [
    {
      id: "mariscos-playa",
      name: "Mariscos Playa",
      category: "mariscos",
      description: "Azul mar, arena y coral para menus frescos de playa.",
      primaryColor: "#0284c7",
      secondaryColor: "#fef3c7",
      accentColor: "#fb7185",
      backgroundColor: "#ecfeff",
      surfaceColor: "#ffffff",
      cardColor: "#cffafe",
      textColor: "#0f172a",
      mutedTextColor: "#475569",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(14,116,144,0.92) 0%, rgba(2,132,199,0.66) 50%, rgba(251,113,133,0.24) 100%)",
      borderRadius: "medium",
      fontMood: "modern",
    },
    {
      id: "mariscos-azul-profundo",
      name: "Mariscos Azul Profundo",
      category: "mariscos",
      description: "Azul profundo, blanco y turquesa para restaurantes de mar con tono premium.",
      primaryColor: "#0ea5e9",
      secondaryColor: "#0f172a",
      accentColor: "#2dd4bf",
      backgroundColor: "#07111f",
      surfaceColor: "#0f1b2d",
      cardColor: "#14243a",
      textColor: "#f8fafc",
      mutedTextColor: "#cbd5e1",
      buttonTextColor: "#07111f",
      heroOverlay:
        "linear-gradient(90deg, rgba(7,17,31,0.98) 0%, rgba(15,23,42,0.88) 48%, rgba(14,165,233,0.3) 100%)",
      borderRadius: "large",
      fontMood: "premium",
    },
    {
      id: "mariscos-fresco",
      name: "Mariscos Fresco",
      category: "mariscos",
      description: "Aqua, limon y blanco para ceviches, aguachiles y menus frescos.",
      primaryColor: "#0891b2",
      secondaryColor: "#ffffff",
      accentColor: "#84cc16",
      backgroundColor: "#f0fdfa",
      surfaceColor: "#ffffff",
      cardColor: "#ccfbf1",
      textColor: "#134e4a",
      mutedTextColor: "#475569",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(19,78,74,0.92) 0%, rgba(8,145,178,0.64) 50%, rgba(132,204,22,0.22) 100%)",
      borderRadius: "soft",
      fontMood: "warm",
    },
  ],
  cafeteria: [
    {
      id: "cafe-clasico",
      name: "Cafe Clasico",
      category: "cafeteria",
      description: "Espresso, crema y dorado para cafeterias sobrias y calidas.",
      primaryColor: "#92400e",
      secondaryColor: "#fef3c7",
      accentColor: "#d97706",
      backgroundColor: "#fef3c7",
      surfaceColor: "#fff7ed",
      cardColor: "#ffffff",
      textColor: "#292524",
      mutedTextColor: "#57534e",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(41,37,36,0.92) 0%, rgba(146,64,14,0.68) 50%, rgba(217,119,6,0.24) 100%)",
      borderRadius: "medium",
      fontMood: "classic",
    },
    {
      id: "cafe-moderno",
      name: "Cafe Moderno",
      category: "cafeteria",
      description: "Negro, blanco y caramelo para cafeterias de especialidad modernas.",
      primaryColor: "#d97706",
      secondaryColor: "#18181b",
      accentColor: "#f59e0b",
      backgroundColor: "#09090b",
      surfaceColor: "#18181b",
      cardColor: "#27272a",
      textColor: "#fafafa",
      mutedTextColor: "#d4d4d8",
      buttonTextColor: "#111827",
      heroOverlay:
        "linear-gradient(90deg, rgba(9,9,11,0.98) 0%, rgba(24,24,27,0.9) 48%, rgba(217,119,6,0.3) 100%)",
      borderRadius: "soft",
      fontMood: "modern",
    },
    {
      id: "cafe-calido",
      name: "Cafe Calido",
      category: "cafeteria",
      description: "Terracota, crema y cafe para menus acogedores y artesanales.",
      primaryColor: "#c2410c",
      secondaryColor: "#ffedd5",
      accentColor: "#78350f",
      backgroundColor: "#fff7ed",
      surfaceColor: "#ffffff",
      cardColor: "#fed7aa",
      textColor: "#292524",
      mutedTextColor: "#57534e",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(120,53,15,0.92) 0%, rgba(194,65,12,0.62) 52%, rgba(254,215,170,0.26) 100%)",
      borderRadius: "large",
      fontMood: "warm",
    },
  ],
  generico: [
    {
      id: "generico-limpio",
      name: "Generico Limpio",
      category: "generico",
      description: "Azul, blanco y gris para negocios generales con lectura clara.",
      primaryColor: "#2563eb",
      secondaryColor: "#ffffff",
      accentColor: "#14b8a6",
      backgroundColor: "#f8fafc",
      surfaceColor: "#ffffff",
      cardColor: "#eef2ff",
      textColor: "#111827",
      mutedTextColor: "#4b5563",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(17,24,39,0.92) 0%, rgba(37,99,235,0.58) 52%, rgba(20,184,166,0.24) 100%)",
      borderRadius: "medium",
      fontMood: "modern",
    },
    {
      id: "generico-premium",
      name: "Generico Premium",
      category: "generico",
      description: "Negro, dorado y gris oscuro para una presencia sobria y premium.",
      primaryColor: "#d97706",
      secondaryColor: "#18181b",
      accentColor: "#fef3c7",
      backgroundColor: "#0f0f10",
      surfaceColor: "#1f1f23",
      cardColor: "#2b2b30",
      textColor: "#fafafa",
      mutedTextColor: "#d4d4d8",
      buttonTextColor: "#111827",
      heroOverlay:
        "linear-gradient(90deg, rgba(15,15,16,0.98) 0%, rgba(31,31,35,0.9) 48%, rgba(217,119,6,0.34) 100%)",
      borderRadius: "large",
      fontMood: "premium",
    },
    {
      id: "generico-nocturno",
      name: "Generico Nocturno",
      category: "generico",
      description: "Zinc oscuro, azul electrico y blanco para menus nocturnos modernos.",
      primaryColor: "#3b82f6",
      secondaryColor: "#27272a",
      accentColor: "#e0f2fe",
      backgroundColor: "#09090b",
      surfaceColor: "#18181b",
      cardColor: "#27272a",
      textColor: "#fafafa",
      mutedTextColor: "#d4d4d8",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(9,9,11,0.98) 0%, rgba(39,39,42,0.9) 48%, rgba(59,130,246,0.34) 100%)",
      borderRadius: "soft",
      fontMood: "modern",
    },
  ],
} satisfies Record<TenantCategory, TenantDesignPreset[]>;

export const TENANT_CATEGORY_OPTIONS: Array<{
  value: TenantCategory;
  label: string;
}> = [
  { value: "tacos", label: "Tacos" },
  { value: "hamburguesas", label: "Hamburguesas" },
  { value: "postres", label: "Postres" },
  { value: "mariscos", label: "Mariscos" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "generico", label: "Generico" },
];

export function normalizeTenantCategory(category: unknown): TenantCategory {
  if (typeof category !== "string") {
    return "generico";
  }

  const normalizedCategory = category
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (
    normalizedCategory === "tacos" ||
    normalizedCategory.includes("taco") ||
    normalizedCategory.includes("taquer") ||
    normalizedCategory.includes("antojito")
  ) {
    return "tacos";
  }

  if (
    normalizedCategory === "hamburguesas" ||
    normalizedCategory.includes("burger") ||
    normalizedCategory.includes("hamburg")
  ) {
    return "hamburguesas";
  }

  if (
    normalizedCategory === "postres" ||
    normalizedCategory.includes("postre") ||
    normalizedCategory.includes("helado") ||
    normalizedCategory.includes("nieve") ||
    normalizedCategory.includes("pastel") ||
    normalizedCategory.includes("reposter")
  ) {
    return "postres";
  }

  if (
    normalizedCategory === "mariscos" ||
    normalizedCategory.includes("marisco") ||
    normalizedCategory.includes("ceviche") ||
    normalizedCategory.includes("aguachile") ||
    normalizedCategory.includes("pescado")
  ) {
    return "mariscos";
  }

  if (
    normalizedCategory === "cafeteria" ||
    normalizedCategory.includes("cafe") ||
    normalizedCategory.includes("coffee")
  ) {
    return "cafeteria";
  }

  return "generico";
}

export function getDefaultPresetForCategory(
  category: TenantCategory | string | null | undefined
): TenantDesignPreset {
  const normalizedCategory = normalizeTenantCategory(category);

  return DESIGN_PRESETS_BY_CATEGORY[normalizedCategory][0];
}

export function getPresetForTenant(
  category: TenantCategory | string | null | undefined,
  designPresetId: string | null | undefined
): TenantDesignPreset {
  const normalizedCategory = normalizeTenantCategory(category);
  const presets = DESIGN_PRESETS_BY_CATEGORY[normalizedCategory];

  return (
    presets.find((preset) => preset.id === designPresetId) ??
    getDefaultPresetForCategory(normalizedCategory)
  );
}

export function isValidPresetForCategory(
  category: TenantCategory | string | null | undefined,
  designPresetId: string | null | undefined
): boolean {
  if (typeof designPresetId !== "string" || designPresetId.trim().length === 0) {
    return false;
  }

  const normalizedCategory = normalizeTenantCategory(category);

  return DESIGN_PRESETS_BY_CATEGORY[normalizedCategory].some(
    (preset) => preset.id === designPresetId
  );
}
