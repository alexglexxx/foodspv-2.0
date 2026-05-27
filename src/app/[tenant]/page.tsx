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

  if (!tenantSnapshot.exists) {
    notFound();
  }

  const tenantRecord = tenantSnapshot.data() as TenantRecord | undefined;

  if (tenantRecord?.active === false) {
    notFound();
  }

  return <OrderMenuClient tenantId={tenant} />;
}
