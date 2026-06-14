import Link from "next/link";
import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/property/property-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { getSessionUser, isContractor } from "@/lib/auth";

export default async function NewPropertyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/oma-tili/huoltokirja/uusi");

  if (await isContractor()) {
    redirect("/oma-tili?viesti=vain-asiakkaalle");
  }

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link
          href="/oma-tili/huoltokirja"
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          ← Huoltokirja
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Lisää kiinteistö</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Täytä perustiedot ja tekniset ominaisuudet. Voit päivittää tietoja myöhemmin
          — ne auttavat urakoitsijoita ja omaa muistia remonttien suunnittelussa.
        </p>
        <div className="mt-8">
          <PropertyForm mode="create" />
        </div>
      </main>
    </div>
  );
}
