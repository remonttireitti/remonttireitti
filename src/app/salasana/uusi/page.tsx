import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import { noIndexRobots } from "@/lib/seo";

export const metadata = noIndexRobots;

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        title="Linkki ei ole voimassa"
        subtitle="Palautuslinkki on vanhentunut tai jo käytetty"
      >
        <p className="text-sm leading-relaxed text-stone-600">
          Pyydä uusi linkki sähköpostiisi ja avaa se mahdollisimman pian
          sen jälkeen.
        </p>
        <Link
          href="/kirjaudu/unohdin-salasanan"
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-orange-700 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
        >
          Pyydä uusi palautuslinkki
        </Link>
        <p className="mt-4 text-center text-sm text-stone-600">
          <Link href="/kirjaudu" className="font-medium text-sky-700 hover:underline">
            ← Kirjaudu
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Uusi salasana" subtitle={`Kirjautuneena: ${user.email}`}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
