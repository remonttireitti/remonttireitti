import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import { fetchHeatPumpCatalog, fetchJobCatalog } from "@/lib/job-catalog-server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ rooli?: string }>;
}) {
  const params = await searchParams;
  const defaultRole =
    params.rooli === "urakoitsija" ? "contractor" : "customer";

  const [catalog, pumpCatalog] = await Promise.all([
    fetchJobCatalog(),
    fetchHeatPumpCatalog(),
  ]);

  const tradeSlugs = new Set<string>(PUBLIC_CONTRACTOR_TRADE_SLUGS);
  const trades = catalog.trades.filter((t) => tradeSlugs.has(t.slug));

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
        trades={trades.map((t) => ({
          id: t.id,
          slug: t.slug,
          name_fi: t.name_fi,
        }))}
        heatPumpJobTypes={pumpCatalog.jobTypes.map((j) => ({
          id: j.id,
          slug: j.slug,
        }))}
      />
    </AuthShell>
  );
}
