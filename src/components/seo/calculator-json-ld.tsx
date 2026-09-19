import { siteConfig } from "@/lib/site-config";
import { publicCalculatorPath } from "@/lib/calculators/registry";
import type { CalculatorConfig } from "@/lib/calculators/types";
import { getSiteUrl } from "@/lib/seo";

export function CalculatorJsonLd({
  config,
  faq,
  urlSlug,
}: {
  config: CalculatorConfig;
  faq?: { q: string; a: string }[];
  /** Julkinen URL-slug (voi olla SEO-alias) */
  urlSlug?: string;
}) {
  const faqItems = faq ?? config.faq;
  const base = getSiteUrl();
  const pageUrl = `${base}${publicCalculatorPath(urlSlug ?? config.slug)}`;

  const graph: Record<string, unknown>[] = [
      {
        "@type": "WebApplication",
        name: config.title,
        description: config.metaDescription,
        url: pageUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        provider: {
          "@type": "Organization",
          name: siteConfig.legalName,
          url: base,
        },
      },
    ];

  if (faqItems.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    });
  }

  graph.push({
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
            item: `${base}/laskurit`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: config.title,
            item: pageUrl,
          },
        ],
      });

  const schema = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
