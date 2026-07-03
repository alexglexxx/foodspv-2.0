import { OrdersDashboardClient } from "@/modules/orders/components/OrdersDashboardClient";
import { getSearchParamValue } from "@/modules/orders/utils/getSearchParamValue";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const requestedTenantId = getSearchParamValue(searchParams.tenantId);

  return <OrdersDashboardClient requestedTenantId={requestedTenantId} />;
}
