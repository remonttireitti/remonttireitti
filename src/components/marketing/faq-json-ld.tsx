import { getSiteUrl } from "@/lib/seo";
import type { HomeFaqItem } from "@/lib/home-faq";

export function FaqJsonLd({ items, pageUrl }: { items: HomeFaqItem[]; pageUrl?: string }) {
  const base = getSiteUrl();
  const url = pageUrl ?? base;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    ...(pageUrl ? { url } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
