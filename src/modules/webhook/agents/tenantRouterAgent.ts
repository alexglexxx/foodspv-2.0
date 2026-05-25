import { adminDb } from "@/lib/firebase-admin";

import type { MetaWebhookPayload } from "../types/metaWebhook";

interface TenantRouterTenant {
  active: boolean;
  metaPhoneNumberId: string;
  [key: string]: unknown;
}

export type TenantRouterResult =
  | {
      found: true;
      tenantId: string;
      tenant: TenantRouterTenant;
    }
  | {
      found: false;
      tenantId: null;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function tenantRouterAgent(input: {
  phoneNumberId: string | null;
  payload: MetaWebhookPayload | null;
}): Promise<TenantRouterResult> {
  const phoneNumberId = isNonEmptyString(input.phoneNumberId)
    ? input.phoneNumberId.trim()
    : "";

  if (!phoneNumberId) {
    return {
      found: false,
      tenantId: null,
    };
  }

  void input.payload;

  const tenantSnapshot = await adminDb
    .collection("tenants")
    .where("metaPhoneNumberId", "==", phoneNumberId)
    .where("active", "==", true)
    .limit(1)
    .get();

  if (tenantSnapshot.empty) {
    return {
      found: false,
      tenantId: null,
    };
  }

  const tenantDocument = tenantSnapshot.docs[0];
  const tenantData = tenantDocument.data();

  if (
    !isNonEmptyString(tenantData.metaPhoneNumberId) ||
    typeof tenantData.active !== "boolean"
  ) {
    return {
      found: false,
      tenantId: null,
    };
  }

  return {
    found: true,
    tenantId: tenantDocument.id,
    tenant: {
      ...tenantData,
      active: tenantData.active,
      metaPhoneNumberId: tenantData.metaPhoneNumberId.trim(),
    },
  };
}
