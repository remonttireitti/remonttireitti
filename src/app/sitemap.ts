import type { MetadataRoute } from "next";
import { getRequestSiteUrl } from "@/lib/seo";
import { fetchPublishedListingsForSitemap } from "@/lib/marketplace-listings-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getRequestSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/markkinapaikka`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/markkinapaikka/ilmoitukset`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${base}/markkinapaikka/hinnasto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/markkinapaikka/ilmoita`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${base}/markkinapaikka/ilmoita?tyyppi=kuluttaja`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${base}/tietosuoja`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/kayttoehdot`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const listings = await fetchPublishedListingsForSitemap();
  const listingPages: MetadataRoute.Sitemap = listings.map((row) => ({
    url: `${base}/markkinapaikka/ilmoitukset/${row.id}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...listingPages];
}
