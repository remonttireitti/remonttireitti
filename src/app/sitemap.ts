import type { MetadataRoute } from "next";
import { fetchSitemapListings } from "@/lib/sitemap-data";
import {
  STATIC_SEO_PAGES,
  marketplaceCategorySitemapEntries,
  publicServiceSitemapEntries,
  troubleshootingSitemapEntries,
} from "@/lib/seo-pages";
import { getSiteUrl } from "@/lib/seo";

/** Julkinen sitemap — ei dynaamisia headereitä (vältetään 500 build/crawl -tilanteissa). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = STATIC_SEO_PAGES.map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const servicePages = publicServiceSitemapEntries(base, now);
  const troubleshootingPages = troubleshootingSitemapEntries(base, now);
  const categoryPages = marketplaceCategorySitemapEntries(base, now);

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

  return [
    ...staticPages,
    ...servicePages,
    ...troubleshootingPages,
    ...categoryPages,
    ...listingPages,
  ];
}
