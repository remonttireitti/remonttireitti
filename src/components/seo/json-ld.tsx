import { siteConfig } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/seo";

/** Organization + WebSite — Google rich results / knowledge panel. */
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
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: siteConfig.name,
        url: base,
        inLanguage: "fi-FI",
        publisher: { "@id": `${base}/#organization` },
        description:
          "Kilpailuta lämpöpumppuasennus, huolto ja korjaus. Markkinapaikka laitteille ja varaosille.",
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
