export type TenantCategory =
  | "tacos"
  | "hamburguesas"
  | "postres"
  | "mariscos"
  | "cafeteria"
  | "generico";

export type TenantFontMood = "bold" | "modern" | "soft";

export interface TenantDesignPreset {
  id: string;
  name: string;
  category: TenantCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
  buttonTextColor: string;
  heroOverlay: string;
  borderRadius: string;
  fontMood: TenantFontMood;
}

export const DESIGN_PRESETS_BY_CATEGORY = {
  tacos: [
    {
      id: "tacos-comal-rojo",
      name: "Comal Rojo",
      category: "tacos",
      description: "Rojo taquero, verde salsa y fondo nocturno para menus con energia.",
      primaryColor: "#dc2626",
      secondaryColor: "#14532d",
      accentColor: "#facc15",
      backgroundColor: "#1a120b",
      textColor: "#fff7ed",
      cardColor: "#27180f",
      buttonTextColor: "#fff7ed",
      heroOverlay:
        "linear-gradient(90deg, rgba(26,18,11,0.98) 0%, rgba(39,24,15,0.9) 48%, rgba(220,38,38,0.42) 100%)",
      borderRadius: "1.45rem",
      fontMood: "bold",
    },
    {
      id: "tacos-salsa-verde",
      name: "Salsa Verde",
      category: "tacos",
      description: "Verde fresco con amarillo maiz para taquerias casuales y luminosas.",
      primaryColor: "#16a34a",
      secondaryColor: "#713f12",
      accentColor: "#f59e0b",
      backgroundColor: "#fff7ed",
      textColor: "#1f2937",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(20,83,45,0.92) 0%, rgba(22,101,52,0.76) 48%, rgba(250,204,21,0.28) 100%)",
      borderRadius: "1.35rem",
      fontMood: "bold",
    },
    {
      id: "tacos-nocturno",
      name: "Nocturno Taquero",
      category: "tacos",
      description: "Fondo profundo, naranja brasa y contraste alto para servicio nocturno.",
      primaryColor: "#f97316",
      secondaryColor: "#27272a",
      accentColor: "#fde047",
      backgroundColor: "#11100d",
      textColor: "#fafaf9",
      cardColor: "#211d18",
      buttonTextColor: "#11100d",
      heroOverlay:
        "linear-gradient(90deg, rgba(17,16,13,0.98) 0%, rgba(33,29,24,0.88) 50%, rgba(249,115,22,0.35) 100%)",
      borderRadius: "1.75rem",
      fontMood: "modern",
    },
  ],
  hamburguesas: [
    {
      id: "hamburguesas-diner-clasico",
      name: "Diner Clasico",
      category: "hamburguesas",
      description: "Rojo, crema y azul oscuro para burgers familiares con look americano.",
      primaryColor: "#b91c1c",
      secondaryColor: "#1e3a8a",
      accentColor: "#fbbf24",
      backgroundColor: "#fff7ed",
      textColor: "#1f2937",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(30,58,138,0.94) 0%, rgba(185,28,28,0.74) 52%, rgba(251,191,36,0.28) 100%)",
      borderRadius: "1.4rem",
      fontMood: "bold",
    },
    {
      id: "hamburguesas-smash-negro",
      name: "Smash Negro",
      category: "hamburguesas",
      description: "Negro premium, queso cheddar y blanco limpio para marcas urbanas.",
      primaryColor: "#f59e0b",
      secondaryColor: "#18181b",
      accentColor: "#ef4444",
      backgroundColor: "#09090b",
      textColor: "#fafafa",
      cardColor: "#18181b",
      buttonTextColor: "#111827",
      heroOverlay:
        "linear-gradient(90deg, rgba(9,9,11,0.98) 0%, rgba(24,24,27,0.9) 50%, rgba(245,158,11,0.34) 100%)",
      borderRadius: "1.1rem",
      fontMood: "modern",
    },
    {
      id: "hamburguesas-barrio-bbq",
      name: "Barrio BBQ",
      category: "hamburguesas",
      description: "Cafe ahumado, tomate y mostaza para hamburguesas artesanales.",
      primaryColor: "#c2410c",
      secondaryColor: "#422006",
      accentColor: "#facc15",
      backgroundColor: "#1c1917",
      textColor: "#fff7ed",
      cardColor: "#292524",
      buttonTextColor: "#fff7ed",
      heroOverlay:
        "linear-gradient(90deg, rgba(28,25,23,0.98) 0%, rgba(66,32,6,0.86) 48%, rgba(194,65,12,0.38) 100%)",
      borderRadius: "1.6rem",
      fontMood: "bold",
    },
  ],
  postres: [
    {
      id: "postres-pastel-atelier",
      name: "Pastel Atelier",
      category: "postres",
      description: "Rosa suave, vino y blanco para reposteria delicada y elegante.",
      primaryColor: "#db2777",
      secondaryColor: "#831843",
      accentColor: "#f9a8d4",
      backgroundColor: "#fff1f2",
      textColor: "#3b1725",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(131,24,67,0.9) 0%, rgba(219,39,119,0.62) 52%, rgba(249,168,212,0.35) 100%)",
      borderRadius: "1.9rem",
      fontMood: "soft",
    },
    {
      id: "postres-cacao-rosa",
      name: "Cacao Rosa",
      category: "postres",
      description: "Chocolate profundo con acentos berry para postres premium.",
      primaryColor: "#be185d",
      secondaryColor: "#431407",
      accentColor: "#f0abfc",
      backgroundColor: "#1c0f0a",
      textColor: "#fff7ed",
      cardColor: "#2a1710",
      buttonTextColor: "#fff7ed",
      heroOverlay:
        "linear-gradient(90deg, rgba(28,15,10,0.98) 0%, rgba(67,20,7,0.88) 48%, rgba(190,24,93,0.34) 100%)",
      borderRadius: "2rem",
      fontMood: "soft",
    },
    {
      id: "postres-vainilla-premium",
      name: "Vainilla Premium",
      category: "postres",
      description: "Crema, caramelo y grafito para una vitrina limpia y sofisticada.",
      primaryColor: "#b45309",
      secondaryColor: "#374151",
      accentColor: "#fcd34d",
      backgroundColor: "#fffbeb",
      textColor: "#292524",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(55,65,81,0.9) 0%, rgba(180,83,9,0.58) 50%, rgba(252,211,77,0.24) 100%)",
      borderRadius: "1.7rem",
      fontMood: "modern",
    },
  ],
  mariscos: [
    {
      id: "mariscos-costa-fresca",
      name: "Costa Fresca",
      category: "mariscos",
      description: "Turquesa, azul profundo y arena para mariscos frescos de playa.",
      primaryColor: "#0891b2",
      secondaryColor: "#164e63",
      accentColor: "#f59e0b",
      backgroundColor: "#ecfeff",
      textColor: "#0f172a",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(22,78,99,0.94) 0%, rgba(8,145,178,0.68) 50%, rgba(245,158,11,0.24) 100%)",
      borderRadius: "1.55rem",
      fontMood: "modern",
    },
    {
      id: "mariscos-azul-profundo",
      name: "Azul Profundo",
      category: "mariscos",
      description: "Azul nocturno y coral para restaurantes de mar con tono premium.",
      primaryColor: "#0ea5e9",
      secondaryColor: "#0f172a",
      accentColor: "#fb7185",
      backgroundColor: "#07111f",
      textColor: "#f8fafc",
      cardColor: "#0f1b2d",
      buttonTextColor: "#07111f",
      heroOverlay:
        "linear-gradient(90deg, rgba(7,17,31,0.98) 0%, rgba(15,23,42,0.88) 48%, rgba(14,165,233,0.3) 100%)",
      borderRadius: "1.85rem",
      fontMood: "modern",
    },
    {
      id: "mariscos-aguachile",
      name: "Aguachile",
      category: "mariscos",
      description: "Lima, verde intenso y azul agua para menus frescos y picantes.",
      primaryColor: "#65a30d",
      secondaryColor: "#155e75",
      accentColor: "#22d3ee",
      backgroundColor: "#f7fee7",
      textColor: "#1f2937",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(21,94,117,0.92) 0%, rgba(101,163,13,0.7) 50%, rgba(34,211,238,0.24) 100%)",
      borderRadius: "1.45rem",
      fontMood: "bold",
    },
  ],
  cafeteria: [
    {
      id: "cafeteria-espresso",
      name: "Espresso",
      category: "cafeteria",
      description: "Cafe oscuro, crema y dorado para cafeterias sobrias y calidas.",
      primaryColor: "#92400e",
      secondaryColor: "#292524",
      accentColor: "#d6a85f",
      backgroundColor: "#1c1917",
      textColor: "#fef3c7",
      cardColor: "#292524",
      buttonTextColor: "#fef3c7",
      heroOverlay:
        "linear-gradient(90deg, rgba(28,25,23,0.98) 0%, rgba(41,37,36,0.88) 48%, rgba(146,64,14,0.34) 100%)",
      borderRadius: "1.5rem",
      fontMood: "modern",
    },
    {
      id: "cafeteria-matcha",
      name: "Matcha",
      category: "cafeteria",
      description: "Verde botanico, crema y madera clara para cafeterias de especialidad.",
      primaryColor: "#4d7c0f",
      secondaryColor: "#365314",
      accentColor: "#a3e635",
      backgroundColor: "#f7fee7",
      textColor: "#1f2937",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(54,83,20,0.92) 0%, rgba(77,124,15,0.68) 48%, rgba(163,230,53,0.22) 100%)",
      borderRadius: "1.8rem",
      fontMood: "soft",
    },
    {
      id: "cafeteria-minimal-crema",
      name: "Minimal Crema",
      category: "cafeteria",
      description: "Blanco crema, negro suave y terracota para menus limpios.",
      primaryColor: "#c2410c",
      secondaryColor: "#1f2937",
      accentColor: "#f59e0b",
      backgroundColor: "#faf7f2",
      textColor: "#1f2937",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(31,41,55,0.9) 0%, rgba(194,65,12,0.58) 52%, rgba(245,158,11,0.22) 100%)",
      borderRadius: "1.25rem",
      fontMood: "modern",
    },
  ],
  generico: [
    {
      id: "generico-bistro-calido",
      name: "Bistro Calido",
      category: "generico",
      description: "Naranja, grafito y crema para restaurantes generales y antojitos.",
      primaryColor: "#ea580c",
      secondaryColor: "#3f3f46",
      accentColor: "#fbbf24",
      backgroundColor: "#fff7ed",
      textColor: "#27272a",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(63,63,70,0.92) 0%, rgba(234,88,12,0.62) 52%, rgba(251,191,36,0.24) 100%)",
      borderRadius: "1.55rem",
      fontMood: "bold",
    },
    {
      id: "generico-urbano-claro",
      name: "Urbano Claro",
      category: "generico",
      description: "Negro, blanco y azul para marcas modernas con menu facil de leer.",
      primaryColor: "#2563eb",
      secondaryColor: "#111827",
      accentColor: "#14b8a6",
      backgroundColor: "#f8fafc",
      textColor: "#111827",
      cardColor: "#ffffff",
      buttonTextColor: "#ffffff",
      heroOverlay:
        "linear-gradient(90deg, rgba(17,24,39,0.92) 0%, rgba(37,99,235,0.58) 52%, rgba(20,184,166,0.24) 100%)",
      borderRadius: "1.25rem",
      fontMood: "modern",
    },
    {
      id: "generico-noche-elegante",
      name: "Noche Elegante",
      category: "generico",
      description: "Fondo oscuro, oro y marfil para menus premium sin categoria especifica.",
      primaryColor: "#d97706",
      secondaryColor: "#18181b",
      accentColor: "#fef3c7",
      backgroundColor: "#0f0f10",
      textColor: "#fafafa",
      cardColor: "#1f1f23",
      buttonTextColor: "#111827",
      heroOverlay:
        "linear-gradient(90deg, rgba(15,15,16,0.98) 0%, rgba(31,31,35,0.9) 48%, rgba(217,119,6,0.34) 100%)",
      borderRadius: "1.85rem",
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

export function normalizeTenantCategory(value: unknown): TenantCategory {
  if (typeof value !== "string") {
    return "generico";
  }

  const normalizedValue = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (
    normalizedValue.includes("taco") ||
    normalizedValue.includes("taquer") ||
    normalizedValue.includes("antojito")
  ) {
    return "tacos";
  }

  if (
    normalizedValue.includes("burger") ||
    normalizedValue.includes("hamburg")
  ) {
    return "hamburguesas";
  }

  if (
    normalizedValue.includes("postre") ||
    normalizedValue.includes("helado") ||
    normalizedValue.includes("nieve") ||
    normalizedValue.includes("pastel") ||
    normalizedValue.includes("reposter")
  ) {
    return "postres";
  }

  if (
    normalizedValue.includes("marisco") ||
    normalizedValue.includes("ceviche") ||
    normalizedValue.includes("aguachile") ||
    normalizedValue.includes("pescado")
  ) {
    return "mariscos";
  }

  if (
    normalizedValue.includes("cafe") ||
    normalizedValue.includes("coffee") ||
    normalizedValue.includes("cafeteria")
  ) {
    return "cafeteria";
  }

  return normalizedValue === "generico" ? "generico" : "generico";
}

export function getDefaultPresetForCategory(
  category: TenantCategory | string | null | undefined
): TenantDesignPreset {
  const normalizedCategory = normalizeTenantCategory(category);

  return DESIGN_PRESETS_BY_CATEGORY[normalizedCategory][0];
}

export function getPresetForTenant(
  category: TenantCategory | string | null | undefined,
  presetId: string | null | undefined
): TenantDesignPreset {
  const normalizedCategory = normalizeTenantCategory(category);
  const presets = DESIGN_PRESETS_BY_CATEGORY[normalizedCategory];

  return (
    presets.find((preset) => preset.id === presetId) ??
    getDefaultPresetForCategory(normalizedCategory)
  );
}
