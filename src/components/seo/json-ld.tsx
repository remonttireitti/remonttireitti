import { siteConfig } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/seo";
import { PUBLIC_SERVICE_SLUGS } from "@/lib/seo-keywords";

/** Organization + WebSite + palvelut — rich results / knowledge panel. */
export function JsonLd() {
  const base = getSiteUrl();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: siteConfig.legalName,
        url: base,
        logo: `${base}/logo.svg`,
        email: siteConfig.email,
        ...(siteConfig.phone ? { telephone: siteConfig.phone } : {}),
        ...(siteConfig.address ? { address: siteConfig.address } : {}),
        ...(() => {
          const sameAs = [siteConfig.instagramUrl, siteConfig.facebookUrl].filter(
            Boolean,
          );
          return sameAs.length > 0 ? { sameAs } : {};
        })(),
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: siteConfig.name,
        url: base,
        inLanguage: "fi-FI",
        publisher: { "@id": `${base}/#organization` },
        description:
          "Kilpailuta remontit, asennukset, huolto ja kunnossapito omakotitaloon. Siivous, piha, muutto — myös jatkuva palvelu. Remonttitori laitteille.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/palvelut/{search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Service",
        "@id": `${base}/#service-marketplace`,
        name: "Remontin kilpailutus",
        provider: { "@id": `${base}/#organization` },
        areaServed: { "@type": "Country", name: "Finland" },
        serviceType: "Remontti-, asennus- ja kunnossapitopalveluiden välitys",
        url: `${base}/palvelut`,
        description:
          "Asiakas luo tarjouspyynnön remontista tai palvelusta, urakoitsijat tarjoavat — vertaile ja valitse paras.",
      },
      {
        "@type": "Service",
        "@id": `${base}/#service-maintenance`,
        name: "Kunnossapito ja toistuvat palvelut",
        provider: { "@id": `${base}/#organization` },
        areaServed: { "@type": "Country", name: "Finland" },
        serviceType: "Siivous, piha, muutto ja muut kotiin liittyvät palvelut",
        url: `${base}/palvelut#palvelut`,
        description:
          "Kertaluonteiset ja jatkuvat palvelut — esim. siivous, nurmikon leikkuu ja lumityö.",
      },
      {
        "@type": "ItemList",
        "@id": `${base}/#services`,
        name: "Palvelut",
        numberOfItems: PUBLIC_SERVICE_SLUGS.length,
        itemListElement: PUBLIC_SERVICE_SLUGS.slice(0, 20).map((slug, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${base}/palvelut/${slug}`,
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
