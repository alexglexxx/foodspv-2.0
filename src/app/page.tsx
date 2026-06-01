import { OrderMenuClient } from "@/modules/orders/components/OrderMenuClient";
import { getSearchParamValue } from "@/modules/orders/utils/getSearchParamValue";

export const dynamic = "force-dynamic";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const tenantId = getSearchParamValue(searchParams.tenantId);

  if (!tenantId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-4 py-10">
        <section className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            FoodSPV
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
            Falta el tenantId
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Abre esta pantalla con un query string válido, por ejemplo:
            `/?tenantId=demo-tenant`.
          </p>
        </section>
      </main>
    );
  }

  return <OrderMenuClient tenantId={tenantId} tenantSlug={tenantId} />;
}
