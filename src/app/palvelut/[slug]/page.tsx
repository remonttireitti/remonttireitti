import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";
import { brand } from "@/lib/brand-theme";
import { fetchPublicJobTypeBySlug } from "@/lib/palvelut-server";
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

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
        <Link href="/palvelut" className="text-sm font-medium text-sky-800 hover:underline">
          ← Kaikki palvelut
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">
          {job.name_fi}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-600">
          {job.description_fi ?? seo.description}
        </p>

        <div className={`${brand.section} mt-8 space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-stone-900">Näin se toimii</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-stone-700">
            <li>Kuvaile työ ja kohde — lisää kuvia ja toiveita.</li>
            <li>Urakoitsijat jättävät tarjouksia alueeltasi.</li>
            <li>Vertaile hintoja ja ehtoja, tingi tarvittaessa.</li>
            <li>Valitse tekijä — maksat urakoitsijalle suoraan.</li>
          </ol>
          <Link href={ctaHref(slug)} className={`${brand.btnPrimary} inline-flex`}>
            Kilpailuta {job.name_fi.toLowerCase()}
          </Link>
        </div>

        {job.search_keywords.length > 0 && (
          <p className="mt-6 text-xs text-stone-500">
            Liittyvät haut: {job.search_keywords.slice(0, 8).join(", ")}
          </p>
        )}
      </main>
    </div>
  );
}
