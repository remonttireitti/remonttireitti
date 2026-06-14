import Link from "next/link";
import { redirect } from "next/navigation";
import { PropertyDetailsDisplay } from "@/components/property/property-details-display";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { formatEurosFromCents } from "@/lib/bids";
import { getSessionUser, isContractor } from "@/lib/auth";
import { PROPERTY_BUILDING_TYPE_LABELS } from "@/lib/property-profile";
import {
  backfillPropertyLogsForCustomer,
  fetchCustomerPropertyLog,
  formatPropertyAddress,
} from "@/lib/property-log";
import { createClient } from "@/lib/supabase/server";

function formatLogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PropertyLogPage({
  searchParams,
}: {
  searchParams: Promise<{ poistettu?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/oma-tili/huoltokirja");

  if (await isContractor()) {
    redirect("/oma-tili?viesti=vain-asiakkaalle");
  }

  const params = await searchParams;
  const supabase = await createClient();
  await backfillPropertyLogsForCustomer(supabase, user.id);
  const groups = await fetchCustomerPropertyLog(supabase, user.id);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <header className={brand.pageHeaderRow}>
          <div>
            <p className="text-sm font-medium text-sky-800">Oma tili</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Kiinteistöt ja huoltokirja
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
              Lisää kodit ja mökit sekä niiden tekniset tiedot. Valmiit urakat
              kirjautuvat automaattisesti työhistoriaan.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/oma-tili/huoltokirja/uusi" className={brand.btnPrimary}>
              Lisää kiinteistö
            </Link>
            <Link href="/oma-tili" className={brand.btnSecondary}>
              Oma tili
            </Link>
          </div>
        </header>

        {params.poistettu === "1" && (
          <p
            className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-800"
            role="status"
          >
            Kiinteistö poistettiin huoltokirjasta.
          </p>
        )}

        {groups.length === 0 ? (
          <div className={`${brand.section} mt-8 px-6 py-12 text-center`}>
            <p className="text-base font-medium text-stone-800">
              Ei kiinteistöjä vielä
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              Lisää ensimmäinen kohde — esim. omakotitalo tai mökki — ja täydennä
              lämmitys, ilmanvaihto ja muut tiedot. Urakoiden historia kertyy
              automaattisesti valmiista töistä.
            </p>
            <Link
              href="/oma-tili/huoltokirja/uusi"
              className={`${brand.btnPrimary} mt-6 inline-flex`}
            >
              Lisää kiinteistö
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {groups.map(({ property, entries }) => (
              <section key={property.id} className={brand.section}>
                <div className={`${brand.sectionHeader} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
                  <div>
                    <h2 className={brand.sectionTitle}>
                      <Link
                        href={`/oma-tili/huoltokirja/${property.id}`}
                        className="hover:text-sky-900 hover:underline"
                      >
                        {property.label?.trim() || formatPropertyAddress(property)}
                      </Link>
                    </h2>
                    {property.label?.trim() && (
                      <p className={brand.sectionDesc}>
                        {formatPropertyAddress(property)}
                      </p>
                    )}
                    {property.property_type && (
                      <p className="mt-1 text-xs font-medium text-sky-800">
                        {PROPERTY_BUILDING_TYPE_LABELS[property.property_type]}
                        {property.built_year ? ` · ${property.built_year}` : ""}
                        {property.floor_area_m2
                          ? ` · ${property.floor_area_m2} m²`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/oma-tili/huoltokirja/${property.id}`}
                    className="shrink-0 text-sm font-medium text-sky-800 hover:underline"
                  >
                    Avaa →
                  </Link>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <PropertyDetailsDisplay property={property} />

                  {entries.length === 0 ? (
                    <p className="mt-4 text-sm text-stone-500">
                      Ei vielä työhistoriaa tälle kohteelle.
                    </p>
                  ) : (
                    <ol className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
                      {entries.slice(0, 3).map((entry) => (
                        <li key={entry.id} className="py-3">
                          <p className="font-medium text-stone-900">{entry.title}</p>
                          <p className="mt-0.5 text-sm text-stone-500">
                            {formatLogDate(entry.performed_at)}
                            {entry.contractor_name && <> · {entry.contractor_name}</>}
                            {entry.amount_cents != null && (
                              <> · {formatEurosFromCents(entry.amount_cents)}</>
                            )}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {entries.length > 3 && (
                    <Link
                      href={`/oma-tili/huoltokirja/${property.id}`}
                      className="mt-2 inline-block text-sm font-medium text-sky-800 hover:underline"
                    >
                      Näytä kaikki {entries.length} merkintää
                    </Link>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
