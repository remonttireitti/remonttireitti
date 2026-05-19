import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
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
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
