import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { normalizeCustomerCode } from "@/modules/customers/utils/generateCustomerCode";

interface CustomerCodeRecord {
  customerId?: unknown;
}

interface CustomerProfileRecord {
  displayName?: unknown;
  customerCode?: unknown;
  blocked?: unknown;
}

function getQueryValue(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);

  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(request: Request) {
  const tenantId = getQueryValue(request, "tenantId");
  const customerCode = getQueryValue(request, "customerCode");

  if (!tenantId || !customerCode) {
    return NextResponse.json(
      {
        found: false,
        message: "tenantId y customerCode son obligatorios.",
      },
      { status: 400 }
    );
  }

  const normalizedCustomerCode = normalizeCustomerCode(customerCode);
  const codeSnapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("customerCodes")
    .doc(normalizedCustomerCode)
    .get();

  if (!codeSnapshot.exists) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const codeRecord = (codeSnapshot.data() ?? {}) as CustomerCodeRecord;

  if (
    typeof codeRecord.customerId !== "string" ||
    codeRecord.customerId.trim().length === 0
  ) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const profileSnapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("customerProfiles")
    .doc(codeRecord.customerId.trim())
    .get();

  if (!profileSnapshot.exists) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const profile = (profileSnapshot.data() ?? {}) as CustomerProfileRecord;

  if (
    typeof profile.displayName !== "string" ||
    typeof profile.customerCode !== "string" ||
    profile.blocked === true
  ) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    customer: {
      customerId: profileSnapshot.id,
      customerCode: profile.customerCode,
      displayName: profile.displayName,
    },
  });
}
