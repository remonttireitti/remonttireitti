import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeviceMaintenanceWizard } from "@/components/project/device-maintenance-wizard";
import { SiteHeader } from "@/components/site-header";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { fetchMaintenanceCatalog } from "@/lib/job-catalog-server";
import {
  mergeMaintenanceInitial,
  parseHuoltoPrefillFromSearchParams,
} from "@/lib/troubleshooting-huolto-prefill";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";
import { brand } from "@/lib/brand-theme";

const seo = seoDefByPath("/huolto/uusi")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/huolto/uusi",
  keywords: seo.keywords,
});

export default async function NewMaintenanceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    laite?: string;
    oire?: string;
    kuvaus?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const query = new URLSearchParams();
  if (sp.laite) query.set("laite", sp.laite);
  if (sp.oire) query.set("oire", sp.oire);
  if (sp.kuvaus) query.set("kuvaus", sp.kuvaus);
  const queryString = query.toString();
  const selfPath = queryString ? `/huolto/uusi?${queryString}` : "/huolto/uusi";

  if (!user) redirect(`/kirjaudu?redirect=${encodeURIComponent(selfPath)}`);

  if (await isContractor()) {
    redirect("/tarjoukset");
  }

  const profile = await getProfile();
  const catalog = await fetchMaintenanceCatalog();
  const prefill = parseHuoltoPrefillFromSearchParams(sp);
  const initialDetails = mergeMaintenanceInitial(prefill);
  const hasPrefill =
    prefill.device_category != null ||
    (prefill.symptoms?.length ?? 0) > 0 ||
    (prefill.issue_description?.length ?? 0) > 0;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link
          href={hasPrefill ? "/vian-selvitys" : "/"}
          className="text-sm text-sky-700 hover:underline"
        >
          ← {hasPrefill ? "Vian selvitys" : "Etusivu"}
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

        {hasPrefill && (
          <p className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
            Tiedot on täytetty vian selvityksestä. Tarkista ja täydennä ennen
            lähettämistä.
          </p>
        )}

        <DeviceMaintenanceWizard
          catalog={catalog}
          defaultEmail={user.email ?? ""}
          defaultPhone={profile?.phone ?? ""}
          initialDetails={initialDetails}
          initialStep={hasPrefill ? 2 : 0}
        />
      </main>
    </div>
  );
}
