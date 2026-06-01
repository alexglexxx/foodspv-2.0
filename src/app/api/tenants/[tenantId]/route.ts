import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";

const MAIN_TENANT_SUBCOLLECTIONS = ["products", "orders"] as const;
const DELETE_BATCH_LIMIT = 450;

function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

async function deleteCollection(
  tenantId: string,
  collectionName: (typeof MAIN_TENANT_SUBCOLLECTIONS)[number]
): Promise<void> {
  const collectionRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection(collectionName);

  while (true) {
    const snapshot = await collectionRef.limit(DELETE_BATCH_LIMIT).get();

    if (snapshot.empty) {
      return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });
    await batch.commit();
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/tenants/[tenantId]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { tenantId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      { success: false, message: "tenantId invalido." },
      { status: 400 }
    );
  }

  try {
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    const tenantSnapshot = await tenantRef.get();

    if (!tenantSnapshot.exists) {
      return NextResponse.json(
        { success: false, message: "El tenant no existe." },
        { status: 404 }
      );
    }

    await Promise.all(
      MAIN_TENANT_SUBCOLLECTIONS.map((collectionName) =>
        deleteCollection(tenantId, collectionName)
      )
    );
    await tenantRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando tenant permanentemente:", error);

    return NextResponse.json(
      { success: false, message: "No se pudo eliminar el tenant." },
      { status: 500 }
    );
  }
}
