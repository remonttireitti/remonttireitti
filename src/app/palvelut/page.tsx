import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PROJECT_AREAS } from "@/constants/project-areas";
import { brand } from "@/lib/brand-theme";
import { fetchPublicJobTypesForSeo } from "@/lib/palvelut-server";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/palvelut")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/palvelut",
  keywords: seo.keywords,
});

export default async function PalvelutPage() {
  const jobs = await fetchPublicJobTypesForSeo();
  const jobsBySlug = new Map(jobs.map((j) => [j.slug, j]));

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Kilpailuta remontit, asennukset ja palvelut
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
          Remontit, lämmitys, siivous, piha, muutto ja muut työt — kertaluonteinen
          tai jatkuva palvelu. Luo ilmainen tarjouspyyntö ja vertaile urakoitsijoiden
          tarjouksia. Voit tingata hintaa ennen valintaa.
        </p>

        <div className="mt-8 space-y-10">
          {PROJECT_AREAS.map((area) => {
            const areaJobs = area.jobSlugs
              .map((slug) => jobsBySlug.get(slug))
              .filter(Boolean);

            if (areaJobs.length === 0) return null;

            return (
              <section key={area.slug} id={area.slug}>
                <h2 className="text-xl font-semibold text-stone-900">{area.title}</h2>
                <p className="mt-1 text-sm text-stone-600">{area.description}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {areaJobs.map((job) => (
                    <li key={job!.slug}>
                      <Link
                        href={`/palvelut/${job!.slug}`}
                        className={`${brand.section} block px-4 py-3 text-sm font-medium text-stone-900 transition hover:border-sky-300 hover:shadow-sm`}
                      >
                        {job!.name_fi}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {jobs.some((j) => j.slug.startsWith("lampopumppu-")) && (
            <section id="huolto-korjaus">
              <h2 className="text-xl font-semibold text-stone-900">
                Lämpöpumpun huolto ja korjaus
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {jobs
                  .filter((j) => j.slug.startsWith("lampopumppu-"))
                  .map((job) => (
                    <li key={job.slug}>
                      <Link
                        href={`/palvelut/${job.slug}`}
                        className={`${brand.section} block px-4 py-3 text-sm font-medium text-stone-900 transition hover:border-sky-300`}
                      >
                        {job.name_fi}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>

        <div className={`${brand.panel} mt-10`}>
          <p className={brand.panelTitle}>Valmis aloittamaan?</p>
          <p className={`${brand.panelText} mt-1`}>
            Kirjaudu sisään ja luo tarjouspyyntö — se on ilmainen eikä sido sinua
            mihinkään.
          </p>
          <Link href="/remontti/uusi" className={`${brand.btnPrimary} mt-4 inline-flex`}>
            Luo tarjouspyyntö
          </Link>
        </div>
      </main>
    </div>
  );
}
