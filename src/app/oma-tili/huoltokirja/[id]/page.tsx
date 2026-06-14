import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PropertyArchiveDocumentsSection } from "@/components/property/property-archive-documents-section";
import { PropertyDetailsDisplay } from "@/components/property/property-details-display";
import { PropertyComponentsSection } from "@/components/property/property-components-section";
import { PropertyDevicesSection } from "@/components/property/property-devices-section";
import { PropertyForm } from "@/components/property/property-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { formatEurosFromCents } from "@/lib/bids";
import { getSessionUser, isContractor } from "@/lib/auth";
import { PROPERTY_BUILDING_TYPE_LABELS } from "@/lib/property-profile";
import { fetchPropertyById, formatPropertyAddress } from "@/lib/property-log";
import { fetchPropertyDevices } from "@/lib/property-devices";
import { fetchPropertyDeviceFiles } from "@/lib/property-device-files";
import { fetchPropertyComponents } from "@/lib/property-components";
import { fetchPropertyComponentFiles } from "@/lib/property-component-files";
import { fetchPropertyArchiveDocuments } from "@/lib/property-archive-documents";
import { createClient } from "@/lib/supabase/server";

function formatLogDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ luotu?: string }>;
}) {
  const { id } = await params;
  const { luotu } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/oma-tili/huoltokirja/${id}`);

  if (await isContractor()) {
    redirect("/oma-tili?viesti=vain-asiakkaalle");
  }

  const supabase = await createClient();
  const data = await fetchPropertyById(supabase, id, user.id);
  if (!data) notFound();

  const { property, entries } = data;
  const archiveDocuments = await fetchPropertyArchiveDocuments(supabase, id);
  const devices = await fetchPropertyDevices(supabase, id, user.id);
  const filesByDevice = Object.fromEntries(
    await fetchPropertyDeviceFiles(
      supabase,
      devices.map((d) => d.id),
    ),
  );
  const components = await fetchPropertyComponents(supabase, id, user.id);
  const filesByComponent = Object.fromEntries(
    await fetchPropertyComponentFiles(
      supabase,
      components.map((c) => c.id),
    ),
  );

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

        {luotu === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Kiinteistö lisätty huoltokirjaan.
          </p>
        )}

        <header className="mt-4">
          <h1 className="text-2xl font-bold text-stone-900">
            {property.label?.trim() || formatPropertyAddress(property)}
          </h1>
          {property.label?.trim() && (
            <p className="mt-1 text-stone-600">{formatPropertyAddress(property)}</p>
          )}
          {property.property_type && (
            <p className="mt-2 text-sm font-medium text-sky-800">
              {PROPERTY_BUILDING_TYPE_LABELS[property.property_type]}
            </p>
          )}
        </header>

        <section className={`${brand.section} mt-6 p-5 sm:p-6`}>
          <h2 className={brand.sectionTitle}>Kiinteistön tiedot</h2>
          <PropertyDetailsDisplay property={property} />
        </section>

        <PropertyArchiveDocumentsSection
          propertyId={id}
          documents={archiveDocuments}
        />

        <PropertyComponentsSection
          propertyId={id}
          components={components}
          filesByComponent={filesByComponent}
        />

        <PropertyDevicesSection
          propertyId={id}
          devices={devices}
          filesByDevice={filesByDevice}
        />

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">Työhistoria</h2>
          {entries.length === 0 ? (
            <p className={`${brand.section} mt-3 px-5 py-8 text-sm text-stone-600`}>
              Ei vielä merkintöjä. Valmiit urakat ilmestyvät tänne automaattisesti.
            </p>
          ) : (
            <ol className={`${brand.section} mt-3 divide-y divide-stone-100`}>
              {entries.map((entry) => (
                <li key={entry.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-stone-900">{entry.title}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {formatLogDate(entry.performed_at)}
                        {entry.contractor_name && <> · {entry.contractor_name}</>}
                      </p>
                      {entry.description && (
                        <p className="mt-2 text-sm leading-relaxed text-stone-700">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      {entry.amount_cents != null && (
                        <p className="text-sm font-semibold text-stone-900">
                          {formatEurosFromCents(entry.amount_cents)}
                        </p>
                      )}
                      {entry.project_id && (
                        <Link
                          href={`/remontti/${entry.project_id}`}
                          className="text-sm font-medium text-sky-800 hover:underline"
                        >
                          Avaa urakka
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Muokkaa tietoja</h2>
          <div className="mt-4">
            <PropertyForm mode="edit" property={property} showDelete />
          </div>
        </section>
      </main>
    </div>
  );
}
