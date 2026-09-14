import { formatEurosFromCents } from "@/lib/bids";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import type { PriceArchiveStat } from "@/lib/price-archive";

type Props = {
  stats: PriceArchiveStat[];
  scopeLabel: string;
  totalSamples: number;
};

/** Hinta-arkisto — Dataset + Offer-rivit rich results -tukeen. */
export function PriceArchiveJsonLd({ stats, scopeLabel, totalSamples }: Props) {
  if (stats.length === 0) return null;

  const base = getSiteUrl();
  const pageUrl = `${base}/hinta-arkisto`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Etusivu", item: base },
          { "@type": "ListItem", position: 2, name: "Hinta-arkisto", item: pageUrl },
        ],
      },
      {
        "@type": "Dataset",
        name: "Remonttireitti hinta-arkisto",
        description:
          "Anonymisoitu yhteenveto hyväksytyistä remontti- ja asennustarjouksista Suomessa.",
        url: pageUrl,
        inLanguage: "fi-FI",
        creator: { "@id": `${base}/#organization` },
        temporalCoverage: "2024/..",
        spatialCoverage: {
          "@type": "Place",
          name: scopeLabel,
        },
        variableMeasured: stats.map((s) => ({
          "@type": "PropertyValue",
          name: s.jobName,
          value: formatEurosFromCents(s.medianCents),
          description: `${s.sampleCount} hyväksyttyä urakkaa, mediaani ${formatEurosFromCents(s.medianCents)} (${formatEurosFromCents(s.minCents)}–${formatEurosFromCents(s.maxCents)})`,
        })),
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "text/html",
          contentUrl: pageUrl,
        },
        keywords: stats.map((s) => `${s.jobName} hinta`).join(", "),
        size: `${totalSamples} urakkaa`,
      },
      {
        "@type": "ItemList",
        name: "Remonttihinnat",
        numberOfItems: stats.length,
        itemListElement: stats.slice(0, 20).map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Offer",
            name: `${s.jobName} — mediaanihinta`,
            price: (s.medianCents / 100).toFixed(0),
            priceCurrency: "EUR",
            eligibleRegion: { "@type": "Country", name: "Finland" },
            offeredBy: { "@id": `${base}/#organization` },
            description: `${s.sampleCount} näytettä, ${scopeLabel}. ${siteConfig.name} hinta-arkisto.`,
            url: `${pageUrl}?tyo=${encodeURIComponent(s.jobSlug)}`,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
