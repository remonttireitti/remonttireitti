import type { MetadataRoute } from "next";
import { fetchSitemapListings } from "@/lib/sitemap-data";
import { getSiteUrl } from "@/lib/seo";

/** Julkinen sitemap — ei dynaamisia headereitä (vältetään 500 build/crawl -tilanteissa). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/urakoitsijaksi`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
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

  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const listings = await fetchSitemapListings();
    listingPages = listings.map((row) => ({
      url: `${base}/markkinapaikka/ilmoitukset/${row.id}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error("[sitemap]", err);
  }

  return [...staticPages, ...listingPages];
}
