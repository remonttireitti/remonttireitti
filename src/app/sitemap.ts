import type { MetadataRoute } from "next";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { LISTING_PRODUCT_CATEGORIES } from "@/lib/marketplace-categories";
import { fetchSitemapListings } from "@/lib/sitemap-data";
import {
  SYMPTOM_SLUGS_BY_PUMP,
  isHeatPumpSlug,
} from "@/lib/troubleshooting-guides";
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
    ...LISTING_PRODUCT_CATEGORIES.map((c) => ({
      url: `${base}/markkinapaikka/ilmoitukset?kategoria=${c.urlSlug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
    })),
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
    {
      url: `${base}/vian-selvitys`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  for (const pump of HEAT_PUMP_JOB_SLUGS) {
    staticPages.push({
      url: `${base}/vian-selvitys/${pump}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
    if (isHeatPumpSlug(pump)) {
      for (const symptom of SYMPTOM_SLUGS_BY_PUMP[pump]) {
        staticPages.push({
          url: `${base}/vian-selvitys/${pump}/${symptom}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  }

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
