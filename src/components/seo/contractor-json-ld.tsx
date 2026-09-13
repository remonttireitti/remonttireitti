import { getSiteUrl } from "@/lib/seo";
import type { PublicContractorProfile } from "@/lib/public-contractor-server";

export function ContractorJsonLd({ profile }: { profile: PublicContractorProfile }) {
  const base = getSiteUrl();
  const url = `${base}/urakoitsija/${profile.id}`;

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.company_name,
    url,
    description:
      profile.description ??
      `${profile.company_name} — urakoitsija Remonttireitissä.`,
    ...(profile.website_url ? { sameAs: [profile.website_url] } : {}),
    ...(profile.service_municipality
      ? {
          areaServed: {
            "@type": "City",
            name: profile.service_municipality,
          },
        }
      : { areaServed: { "@type": "Country", name: "Finland" } }),
  };

  if (profile.rating && profile.rating.count > 0) {
    graph.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: profile.rating.average.toFixed(1),
      reviewCount: profile.rating.count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
