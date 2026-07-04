import "server-only";

import { formatRecentOrdersForWhatsApp } from "@/modules/orders/formatters/orderWhatsAppSummary";
import { listRecentTenantOrders } from "@/modules/orders/server/listRecentTenantOrders";
import type { TenantRouterResult } from "@/modules/webhook/agents/tenantRouterAgent";

import {
  parseWhatsAppCommand,
  type WhatsAppCommandParseResult,
} from "./whatsappCommandParser";

interface RecentOrdersCommandResult {
  matched: boolean;
  shouldReply: boolean;
  message: string | null;
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function getAuthorizedPhones(tenantRoute: TenantRouterResult): string[] | null {
  if (!tenantRoute.found) {
    return null;
  }

  const tenantRecord = tenantRoute.tenant as {
    authorizedWhatsappPhones?: unknown;
  };

  if (!Array.isArray(tenantRecord.authorizedWhatsappPhones)) {
    return null;
  }

  const authorizedPhones = tenantRecord.authorizedWhatsappPhones
    .filter((phone): phone is string => typeof phone === "string")
    .map((phone) => normalizePhone(phone))
    .filter((phone) => phone.length > 0);

  return authorizedPhones.length > 0 ? authorizedPhones : null;
}

function isAuthorizedSender(
  tenantRoute: TenantRouterResult,
  senderPhone: string
): boolean {
  const authorizedPhones = getAuthorizedPhones(tenantRoute);

  if (!authorizedPhones) {
    // MVP fallback: if no authorizedWhatsappPhones exists yet, the tenant line
    // answers commands to any sender that reaches this WhatsApp number.
    return true;
  }

  return authorizedPhones.includes(normalizePhone(senderPhone));
}

function createHelpMessage(): string {
  return [
    "Comandos disponibles:",
    "ULTIMO",
    "ULTIMOS",
    "ULTIMOS 2",
    "ULTIMOS 3",
    "PEDIDOS",
    "AYUDA",
    "",
    "Máximo 3 pedidos por consulta.",
  ].join("\n");
}

export async function executeRecentOrdersCommand(input: {
  tenantRoute: TenantRouterResult;
  senderPhone: string;
  messageBody: string;
}): Promise<RecentOrdersCommandResult> {
  const command = parseWhatsAppCommand(input.messageBody);

  if (!command.matched) {
    return {
      matched: false,
      shouldReply: false,
      message: null,
    };
  }

  if (!input.tenantRoute.found) {
    return {
      matched: true,
      shouldReply: false,
      message: null,
    };
  }

  if (!isAuthorizedSender(input.tenantRoute, input.senderPhone)) {
    return {
      matched: true,
      shouldReply: true,
      message: "Este número no está autorizado para consultar pedidos.",
    };
  }

  if (command.command === "help") {
    return {
      matched: true,
      shouldReply: true,
      message: createHelpMessage(),
    };
  }

  const limit = resolveCommandLimit(command);
  const orders = await listRecentTenantOrders(input.tenantRoute.tenantId, limit);

  return {
    matched: true,
    shouldReply: true,
    message: formatRecentOrdersForWhatsApp(orders),
  };
}

function resolveCommandLimit(command: WhatsAppCommandParseResult): number {
  if (command.command === "latest_order") {
    return 1;
  }

  if (command.command === "recent_orders") {
    return Math.min(Math.max(command.limit, 1), 3);
  }

  return 0;
}
