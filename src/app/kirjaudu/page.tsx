import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; vahvistus?: string; virhe?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Kirjaudu"
      subtitle="Kirjaudu Remonttireitti-lämpöpumppupalveluun"
    >
      {params.vahvistus === "1" && (
        <p className="mb-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
          Tili luotu! Tarkista sähköpostisi ja vahvista osoite ennen kirjautumista.
        </p>
      )}
      {params.virhe === "vahvistys" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Sähköpostin vahvistus epäonnistui. Yritä kirjautua uudelleen.
        </p>
      )}
      <LoginForm redirectTo={params.redirect} />
    </AuthShell>
  );
}
