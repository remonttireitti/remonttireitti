import { FaqJsonLd } from "@/components/marketing/faq-json-ld";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import type { ServiceContentBlock } from "@/lib/service-page-content";

type Props = {
  slug: string;
  name: string;
  description: string;
  content: ServiceContentBlock;
};

export function ServicePageJsonLd({ slug, name, description, content }: Props) {
  const base = getSiteUrl();
  const url = `${base}/palvelut/${slug}`;

  const serviceGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Etusivu", item: base },
          { "@type": "ListItem", position: 2, name: "Palvelut", item: `${base}/palvelut` },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
      {
        "@type": "Service",
        name,
        description,
        url,
        provider: { "@id": `${base}/#organization` },
        areaServed: { "@type": "Country", name: "Finland" },
        serviceType: name,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Tarjouspyynnön luonti asiakkaalle ilmaiseksi",
          url: `${base}/remontti/uusi?tyyppi=${slug}`,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `${name} — kilpailuta ilmaiseksi | ${siteConfig.name}`,
        inLanguage: "fi-FI",
        isPartOf: { "@id": `${base}/#website` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceGraph) }}
      />
      <FaqJsonLd
        pageUrl={url}
        items={content.faq.map((item, i) => ({
          id: `faq-${slug}-${i}`,
          ...item,
        }))}
      />
    </>
  );
}
