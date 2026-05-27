import { adminDb } from "@/lib/firebase-admin";

import type { MetaWebhookPayload } from "../types/metaWebhook";

interface TenantRouterTenant {
  active?: boolean;
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
    .limit(10)
    .get();

  if (tenantSnapshot.empty) {
    return {
      found: false,
      tenantId: null,
    };
  }

  const tenantDocument = tenantSnapshot.docs.find((document) => {
    const tenantData = document.data();

    return tenantData.active !== false;
  });

  if (!tenantDocument) {
    return {
      found: false,
      tenantId: null,
    };
  }

  const tenantData = tenantDocument.data();

  if (!isNonEmptyString(tenantData.metaPhoneNumberId)) {
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
      active:
        typeof tenantData.active === "boolean" ? tenantData.active : undefined,
      metaPhoneNumberId: tenantData.metaPhoneNumberId.trim(),
    },
  };
}
