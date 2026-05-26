import { adminDb } from "@/lib/firebase-admin";
import type {
  OrderFlowMode,
  TenantOrderFlowConfig,
} from "@/types/tenant.types";

const DEFAULT_ORDER_FLOW_MODE: OrderFlowMode = "simple_whatsapp";
const DEFAULT_ESTIMATED_PREPARATION_MINUTES = 15;

interface TenantOrderFlowRecord {
  name?: unknown;
  orderFlowMode?: unknown;
  estimatedPreparationMinutes?: unknown;
}

export interface TenantOrderFlowConfigResult {
  config: TenantOrderFlowConfig;
  tenantName: string;
  source: "tenant" | "default";
}

function getTenantName(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return "tu negocio";
}

function isOrderFlowMode(value: unknown): value is OrderFlowMode {
  return (
    value === "simple_whatsapp" || value === "dashboard_managed"
  );
}

function normalizeEstimatedPreparationMinutes(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isInteger(value)
  ) {
    return null;
  }

  return value;
}

export async function tenantOrderFlowConfigAgent(
  tenantId: string
): Promise<TenantOrderFlowConfigResult> {
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    return {
      config: {
        orderFlowMode: DEFAULT_ORDER_FLOW_MODE,
        estimatedPreparationMinutes: DEFAULT_ESTIMATED_PREPARATION_MINUTES,
      },
      tenantName: "tu negocio",
      source: "default",
    };
  }

  const tenantData = (tenantSnapshot.data() ?? {}) as TenantOrderFlowRecord;
  const orderFlowMode = isOrderFlowMode(tenantData.orderFlowMode)
    ? tenantData.orderFlowMode
    : DEFAULT_ORDER_FLOW_MODE;
  const estimatedPreparationMinutes = normalizeEstimatedPreparationMinutes(
    tenantData.estimatedPreparationMinutes
  );

  return {
    config: {
      orderFlowMode,
      estimatedPreparationMinutes:
        estimatedPreparationMinutes ?? DEFAULT_ESTIMATED_PREPARATION_MINUTES,
    },
    tenantName: getTenantName(tenantData.name),
    source:
      isOrderFlowMode(tenantData.orderFlowMode) &&
      estimatedPreparationMinutes !== null
        ? "tenant"
        : "default",
  };
}
