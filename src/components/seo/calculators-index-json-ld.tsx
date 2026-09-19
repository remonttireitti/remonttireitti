import { availableFeaturedCalculators, featuredCalculatorHref } from "@/lib/calculators/featured";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export function CalculatorsIndexJsonLd() {
  const base = getSiteUrl();
  const pageUrl = `${base}/laskurit`;
  const featured = availableFeaturedCalculators();

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Remontin hintalaskurit",
        description:
          "Ilmaiset remonttilaskurit suomalaisilla viitehinnoilla — arvioi kustannukset ennen tarjouspyyntöä.",
        url: pageUrl,
        inLanguage: "fi-FI",
        isPartOf: {
          "@type": "WebSite",
          name: siteConfig.legalName,
          url: base,
        },
      },
      {
        "@type": "ItemList",
        name: "Suosituimmat remonttilaskurit",
        itemListElement: featured.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          url: `${base}${featuredCalculatorHref(item.hrefSlug)}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Etusivu",
            item: base,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Laskurit",
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
