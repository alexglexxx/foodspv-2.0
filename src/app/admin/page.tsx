import { OrdersDashboardClient } from "@/modules/orders/components/OrdersDashboardClient";
import { getSearchParamValue } from "@/modules/orders/utils/getSearchParamValue";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  // Support only: this external tenant selector is honored exclusively for
  // superadmin users. tenant_admin and employee users resolve their tenant from
  // users/{uid}.tenantId and ignore any incoming tenantId query param.
  const requestedTenantId = getSearchParamValue(searchParams.tenantId);

  return <OrdersDashboardClient requestedTenantId={requestedTenantId} />;
}
