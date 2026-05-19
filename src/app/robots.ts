import type { MetadataRoute } from "next";
import { getRequestSiteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getRequestSiteUrl();

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
