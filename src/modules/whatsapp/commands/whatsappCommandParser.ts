export type WhatsAppCommandName =
  | "latest_order"
  | "recent_orders"
  | "help";

export interface WhatsAppCommandParseResult {
  matched: boolean;
  command: WhatsAppCommandName | null;
  limit: number;
  normalizedText: string;
}

const MAX_RECENT_ORDERS_LIMIT = 3;

function toPositiveLimit(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return MAX_RECENT_ORDERS_LIMIT;
  }

  return Math.min(MAX_RECENT_ORDERS_LIMIT, parsedValue);
}

export function normalizeWhatsAppCommandText(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function parseWhatsAppCommand(value: string): WhatsAppCommandParseResult {
  const normalizedText = normalizeWhatsAppCommandText(value);

  if (normalizedText === "AYUDA") {
    return {
      matched: true,
      command: "help",
      limit: 0,
      normalizedText,
    };
  }

  if (normalizedText === "ULTIMO") {
    return {
      matched: true,
      command: "latest_order",
      limit: 1,
      normalizedText,
    };
  }

  if (normalizedText === "ULTIMOS" || normalizedText === "PEDIDOS") {
    return {
      matched: true,
      command: "recent_orders",
      limit: MAX_RECENT_ORDERS_LIMIT,
      normalizedText,
    };
  }

  const recentOrdersMatch = normalizedText.match(/^ULTIMOS (\d+)$/);

  if (recentOrdersMatch) {
    return {
      matched: true,
      command: "recent_orders",
      limit: toPositiveLimit(recentOrdersMatch[1]),
      normalizedText,
    };
  }

  return {
    matched: false,
    command: null,
    limit: 0,
    normalizedText,
  };
}
