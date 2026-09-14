import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getContractorSelectableTrades } from "@/lib/contractor-trade-options";
import { fetchHeatPumpCatalog, fetchJobCatalog } from "@/lib/job-catalog-server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ rooli?: string; email?: string; suosittelija?: string }>;
}) {
  const params = await searchParams;
  const defaultRole =
    params.rooli === "urakoitsija" ? "contractor" : "customer";
  const defaultEmail = params.email?.trim() ?? "";
  const defaultReferrerEmail = params.suosittelija?.trim() ?? "";
  const defaultCustomerReferrerEmail = params.suosittelija?.trim() ?? "";

  const [catalog, pumpCatalog] = await Promise.all([
    fetchJobCatalog(),
    fetchHeatPumpCatalog(),
  ]);

  const trades = getContractorSelectableTrades(catalog.trades);

  return (
    <AuthShell
      title="Luo tili"
      subtitle={
        defaultRole === "contractor"
          ? "Rekisteröidy urakoitsijaksi — valitse ammatit"
          : "Ilmainen rekisteröityminen asiakkaalle"
      }
    >
      <RegisterForm
        defaultRole={defaultRole}
        defaultEmail={defaultEmail}
        defaultReferrerEmail={defaultReferrerEmail}
        defaultCustomerReferrerEmail={defaultCustomerReferrerEmail}
        trades={trades}
        heatPumpJobTypes={pumpCatalog.jobTypes.map((j) => ({
          id: j.id,
          slug: j.slug,
        }))}
      />
    </AuthShell>
  );
}
