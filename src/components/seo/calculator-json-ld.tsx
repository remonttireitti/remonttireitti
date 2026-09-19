import { siteConfig } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/seo";

const faqItems = [
  {
    question: "Paljonko kylpyhuoneremontti maksaa neliöltä?",
    answer:
      "Täysremontin neliöhinta Suomessa on tyypillisesti 900–2 000 euroa lattia-neliöltä riippuen alueesta, materiaaleista ja siitä, uusitaanko putket ja sähköt. Pienessä kylpyhuoneessa neliöhinta on usein korkeampi kuin isossa.",
  },
  {
    question: "Mitä maksaa kylpyhuoneen vesieristys?",
    answer:
      "Pelkkä vesieristys maksaa usein 500–2 500 euroa tilan koosta riippuen. Yhdessä laatoituksen kanssa kokonaisuus on tyypillisesti 2 000–5 000 euroa. Vesieristys vaatii sertifioidun tekijän.",
  },
  {
    question: "Onko laskurin hinta sitova?",
    answer:
      "Ei. Laskuri on suuntaa-antava työkalu budjetointiin. Tarkan hinnan saat kilpailuttamalla remontin Remonttireitillä — urakoitsijat arvioivat kohteen paikan päällä tai tarjouspyynnön perusteella.",
  },
];

export function BathroomCalculatorJsonLd() {
  const base = getSiteUrl();
  const pageUrl = `${base}/laskurit/kylpyhuoneremontti`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
          {
            "@type": "WebApplication",
            name: "Kylpyhuoneremontin hintalaskuri",
            description:
              "Arvioi kylpyhuoneremontin kustannukset: purku, vesieristys, laatoitus, LVI ja kalusteet.",
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
          {
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
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
                item: `${base}/laskurit`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "Kylpyhuoneremontti",
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
