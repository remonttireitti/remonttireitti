import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/** Julkinen robots.txt — ei indeksoida kirjautumista, hallintaa eikä henkilökohtaisia sivuja. */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/admin/",
        "/oma-tili",
        "/kirjaudu",
        "/rekisteroidy",
        "/remontti/",
        "/tarjoukset/",
        "/auth/",
        "/api/",
        "/markkinapaikka/omat-ilmoitukset",
        "/markkinapaikka/tilaa",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
