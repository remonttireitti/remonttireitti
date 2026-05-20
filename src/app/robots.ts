import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
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
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
