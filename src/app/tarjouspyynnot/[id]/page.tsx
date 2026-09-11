import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { formatBudget } from "@/lib/projects";
import { fetchPublicOpenProject } from "@/lib/public-projects-server";
import { pageMetadata } from "@/lib/seo";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchPublicOpenProject(id);
  if (!project) {
    return pageMetadata({
      title: "Tarjouspyyntö",
      description: "Avoin tarjouspyyntö Remonttireitillä.",
      path: `/tarjouspyynnot/${id}`,
      noIndex: true,
    });
  }

  return pageMetadata({
    title: project.title,
    description: project.summary,
    path: `/tarjouspyynnot/${id}`,
  });
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await fetchPublicOpenProject(id);
  if (!project) notFound();

  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;
  const label = project.job_type_name ?? project.category_name;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link
          href="/tarjouspyynnot"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Kaikki tarjouspyynnöt
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{project.title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {label} · {project.municipality} · {formatWhen(project.created_at)}
        </p>

        <section className={`${brand.section} mt-6 p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Kuvaus
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {project.summary}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-stone-500">Budjetti</dt>
              <dd className="mt-0.5 text-stone-900">
                {formatBudget(project.budget_min, project.budget_max)}
              </dd>
            </div>
            {project.bid_count > 0 && (
              <div>
                <dt className="font-medium text-stone-500">Tarjouksia</dt>
                <dd className="mt-0.5 text-stone-900">{project.bid_count}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="mt-6 rounded-xl border border-sky-100 bg-sky-50/60 p-5">
          <h2 className="font-semibold text-stone-900">Haluatko tarjota?</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Täydet tiedot, kuvat ja yhteystiedot avautuvat urakoitsijatilillä.
            Tarjouksen jättäminen on maksutonta — maksat välityspalkkion vain,
            jos asiakas hyväksyy tarjouksesi.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {contractor ? (
              <Link
                href={`/tarjoukset/${project.id}`}
                className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
              >
                Avaa pyyntö ja jätä tarjous
              </Link>
            ) : user ? (
              <Link
                href="/oma-tili?viesti=vain-urakoitsijalle"
                className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
              >
                Tarvitset urakoitsijatilin
              </Link>
            ) : (
              <>
                <Link
                  href={`/kirjaudu?redirect=/tarjoukset/${project.id}`}
                  className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
                >
                  Kirjaudu ja tarjoa
                </Link>
                <Link
                  href={`/rekisteroidy?rooli=urakoitsija&redirect=/tarjoukset/${project.id}`}
                  className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
                >
                  Luo urakoitsijatili
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
