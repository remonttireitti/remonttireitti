import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { fetchHeatPumpCatalog } from "@/lib/job-catalog-server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ rooli?: string }>;
}) {
  const params = await searchParams;
  const defaultRole =
    params.rooli === "urakoitsija" ? "contractor" : "customer";

  const catalog = await fetchHeatPumpCatalog();

  return (
    <AuthShell
      title="Luo tili"
      subtitle={
        defaultRole === "contractor"
          ? "Rekisteröidy lämpöpumppuasentajaksi — ilmoita pätevyydet"
          : "Ilmainen rekisteröityminen asiakkaalle"
      }
    >
      <RegisterForm
        defaultRole={defaultRole}
        heatPumpJobTypes={catalog.jobTypes.map((j) => ({
          id: j.id,
          slug: j.slug,
        }))}
      />
    </AuthShell>
  );
}
