import { notFound } from "next/navigation";

import { adminDb } from "@/lib/firebase-admin";
import { OrderMenuClient } from "@/modules/orders/components/OrderMenuClient";

export const dynamic = "force-dynamic";

interface TenantRecord {
  active?: unknown;
}

export default async function TenantPage(props: PageProps<"/[tenant]">) {
  const { tenant } = await props.params;
  const tenantSnapshot = await adminDb.collection("tenants").doc(tenant).get();
  let resolvedTenantId = tenantSnapshot.id;
  let tenantRecord = tenantSnapshot.data() as TenantRecord | undefined;

  if (!tenantSnapshot.exists) {
    const slugSnapshot = await adminDb
      .collection("tenants")
      .where("slug", "==", tenant)
      .limit(1)
      .get();

    if (slugSnapshot.empty) {
      notFound();
    }

    const slugTenantSnapshot = slugSnapshot.docs[0];
    resolvedTenantId = slugTenantSnapshot.id;
    tenantRecord = slugTenantSnapshot.data() as TenantRecord | undefined;
  }

  if (tenantRecord?.active === false) {
    notFound();
  }

  return <OrderMenuClient tenantId={resolvedTenantId} />;
}
