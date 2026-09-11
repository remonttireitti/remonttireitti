import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { formatBudget } from "@/lib/projects";
import { fetchPublicOpenProjects } from "@/lib/public-projects-server";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/tarjouspyynnot")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/tarjouspyynnot",
  keywords: seo.keywords,
});

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function projectLabel(p: Awaited<ReturnType<typeof fetchPublicOpenProjects>>[number]) {
  return p.job_type_name ?? p.category_name;
}

export default async function PublicProjectsPage() {
  const user = await getSessionUser();
  const [projects, contractor] = await Promise.all([
    fetchPublicOpenProjects(),
    user ? isContractor() : Promise.resolve(false),
  ]);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <h1 className="text-2xl font-bold">Avoimet tarjouspyynnöt</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Selaa julkisia pyyntöjä ilman kirjautumista. Yhteystiedot, kuvat ja
          tarjouksen jättö avautuvat urakoitsijatilillä.
        </p>

        {!contractor && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/rekisteroidy?rooli=urakoitsija"
              className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
            >
              Rekisteröidy urakoitsijaksi
            </Link>
            <Link
              href={user ? "/tarjoukset" : "/kirjaudu?redirect=/tarjoukset"}
              className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
            >
              {user ? "Siirry urakoitsijan näkymään" : "Kirjaudu urakoitsijana"}
            </Link>
          </div>
        )}

        {contractor && (
          <p className="mt-6 text-sm text-stone-600">
            Olet kirjautuneena urakoitsijana.{" "}
            <Link href="/tarjoukset" className="font-medium text-sky-800 hover:underline">
              Avaa täydet tiedot ja jätä tarjous →
            </Link>
          </p>
        )}

        {!projects.length ? (
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
            <p>Ei avoimia tarjouspyyntöjä juuri nyt.</p>
            <p className="mt-2 text-sm">
              Seuraa sivua uudelleen tai{" "}
              <Link href="/urakoitsijaksi" className="text-sky-800 hover:underline">
                rekisteröidy urakoitsijaksi
              </Link>{" "}
              saadaksesi ilmoituksen uusista pyynnöistä.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/tarjouspyynnot/${p.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-medium text-stone-900">{p.title}</h2>
                    <span className="text-xs text-stone-500">{formatWhen(p.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.summary}</p>
                  <p className="mt-2 text-sm text-stone-500">
                    {projectLabel(p)} · {p.municipality}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Budjetti: {formatBudget(p.budget_min, p.budget_max)}
                    {p.bid_count > 0 && (
                      <span className="text-stone-500">
                        {" "}
                        · {p.bid_count} tarjousta
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
