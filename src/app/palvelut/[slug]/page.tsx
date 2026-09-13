import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ServicePageJsonLd } from "@/components/seo/service-page-json-ld";
import { SiteHeader } from "@/components/site-header";
import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";
import { brand } from "@/lib/brand-theme";
import { fetchPublicJobTypeBySlug } from "@/lib/palvelut-server";
import { getServicePageContent } from "@/lib/service-page-content";
import { pageMetadata } from "@/lib/seo";
import { PUBLIC_SERVICE_SLUGS } from "@/lib/seo-keywords";
import { buildServicePageSeo } from "@/lib/seo-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PUBLIC_SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await fetchPublicJobTypeBySlug(slug);
  if (!job) {
    return pageMetadata({
      title: "Palvelu",
      description: "Kilpailuta remontti ilmaiseksi.",
      noIndex: true,
    });
  }

  const seo = buildServicePageSeo(job);
  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/palvelut/${slug}`,
    keywords: seo.keywords,
  });
}

function ctaHref(slug: string): string {
  if ((MAINTENANCE_JOB_SLUGS as readonly string[]).includes(slug)) {
    return `/huolto/uusi?tyyppi=${slug}`;
  }
  return `/remontti/uusi?tyyppi=${slug}`;
}

export default async function PalveluPage({ params }: Props) {
  const { slug } = await params;
  const job = await fetchPublicJobTypeBySlug(slug);
  if (!job) notFound();

  const seo = buildServicePageSeo(job);
  const content = getServicePageContent(slug, job.name_fi);

  return (
    <div className={brand.page}>
      <ServicePageJsonLd
        slug={slug}
        name={job.name_fi}
        description={job.description_fi ?? seo.description}
        content={content}
      />
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/palvelut" className="text-sm font-medium text-sky-800 hover:underline">
          ← Kaikki palvelut
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
          {job.name_fi}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-600">
          {job.description_fi ?? seo.description}
        </p>

        <div className={`${brand.section} mt-8 space-y-4 p-4 sm:p-6`}>
          <h2 className="text-lg font-semibold text-stone-900">Näin se toimii</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-stone-700">
            <li>Kuvaile työ ja kohde — lisää kuvia ja toiveita.</li>
            <li>Urakoitsijat jättävät tarjouksia alueeltasi.</li>
            <li>Vertaile hintoja ja ehtoja, tingi tarvittaessa.</li>
            <li>Valitse tekijä — maksat urakoitsijalle suoraan.</li>
          </ol>
          <Link
            href={ctaHref(slug)}
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock} touch-target inline-flex`}
          >
            Kilpailuta {job.name_fi.toLowerCase()}
          </Link>
        </div>

        <section className={`${brand.section} mt-6 space-y-3 p-4 sm:p-6`}>
          <h2 className="text-lg font-semibold text-stone-900">{content.scopeTitle}</h2>
          <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-stone-700">
            {content.scopeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-stone-900">Usein kysyttyä</h2>
          <div className="space-y-3">
            {content.faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-stone-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-medium text-stone-900 marker:content-none">
                  {item.question}
                  <span className="ml-2 text-xs font-normal text-sky-700 group-open:hidden">
                    Näytä vastaus
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {content.relatedLinks.length > 0 && (
          <nav className="mt-8" aria-label="Liittyvät sivut">
            <h2 className="text-sm font-semibold text-stone-800">Liittyvät sivut</h2>
            <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {content.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {job.search_keywords.length > 0 && (
          <p className="mt-6 text-xs text-stone-500">
            Liittyvät haut: {job.search_keywords.slice(0, 10).join(", ")}
          </p>
        )}
      </main>
    </div>
  );
}
