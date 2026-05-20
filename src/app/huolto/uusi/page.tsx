import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeviceMaintenanceWizard } from "@/components/project/device-maintenance-wizard";
import { SiteHeader } from "@/components/site-header";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { fetchMaintenanceCatalog } from "@/lib/job-catalog-server";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Huolto tai korjaus — lämpöpumppu",
  description:
    "Kilpailuta lämpöpumpun huolto tai korjaus. Kuvaile vika, lisää kuvia ja saa tarjouksia urakoitsijoilta.",
  path: "/huolto/uusi",
  noIndex: true,
});

export default async function NewMaintenanceRequestPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/huolto/uusi");

  if (await isContractor()) {
    redirect("/tarjoukset");
  }

  const profile = await getProfile();
  const catalog = await fetchMaintenanceCatalog();

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Huolto tai korjaus</h1>
        <p className="mt-2 text-sm text-stone-600">
          Kilpailuta lämpöpumpun huolto tai korjaus. Urakoitsijat, jotka asentavat
          valitsemaasi laitetyyppiä, saavat ilmoituksen ja voivat jättää tarjouksen.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Uusi asennus?{" "}
          <Link href="/remontti/uusi" className="text-sky-700 hover:underline">
            Kilpailuta lämpöpumppuasennus
          </Link>
        </p>

        <DeviceMaintenanceWizard
          catalog={catalog}
          defaultEmail={user.email ?? ""}
          defaultPhone={profile?.phone ?? ""}
        />
      </main>
    </div>
  );
}
