import type { MetadataRoute } from "next";
import {
  fetchSitemapContractors,
  fetchSitemapHelpRequests,
  fetchSitemapListings,
  fetchSitemapProjects,
} from "@/lib/sitemap-data";
import { SHOW_MARKETPLACE_IN_MARKETING } from "@/lib/marketing-focus";
import { getCalculatorSlugs } from "@/lib/calculators/registry";
import {
  STATIC_SEO_PAGES,
  calculatorSitemapEntries,
  contractorProfileSitemapEntries,
  helpRequestSitemapEntries,
  marketplaceCategorySitemapEntries,
  publicServiceSitemapEntries,
  troubleshootingSitemapEntries,
} from "@/lib/seo-pages";
import { getSiteUrl } from "@/lib/seo";

const MARKETPLACE_PATH_PREFIX = "/markkinapaikka";
const NOINDEX_STATIC_PATHS = new Set(["/huolto/uusi"]);

/** Julkinen sitemap — ei dynaamisia headereitä (vältetään 500 build/crawl -tilanteissa). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = STATIC_SEO_PAGES.filter((page) => {
    if (NOINDEX_STATIC_PATHS.has(page.path)) return false;
    if (
      !SHOW_MARKETPLACE_IN_MARKETING &&
      page.path.startsWith(MARKETPLACE_PATH_PREFIX)
    ) {
      return false;
    }
    return true;
  }).map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const servicePages = publicServiceSitemapEntries(base, now);
  const troubleshootingPages = troubleshootingSitemapEntries(base, now);
  const calculatorPages = calculatorSitemapEntries(base, now, getCalculatorSlugs());

  let categoryPages: MetadataRoute.Sitemap = [];
  let listingPages: MetadataRoute.Sitemap = [];

  if (SHOW_MARKETPLACE_IN_MARKETING) {
    categoryPages = marketplaceCategorySitemapEntries(base, now);
    try {
      const listings = await fetchSitemapListings();
      listingPages = listings.map((row) => ({
        url: `${base}/markkinapaikka/ilmoitukset/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    } catch (err) {
      console.error("[sitemap listings]", err);
    }
  }

  let projectPages: MetadataRoute.Sitemap = [];
  try {
    const projects = await fetchSitemapProjects();
    projectPages = projects.map((row) => ({
      url: `${base}/tarjouspyynnot/${row.id}`,
      lastModified: new Date(row.created_at),
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));
  } catch (err) {
    console.error("[sitemap projects]", err);
  }

  let contractorPages: MetadataRoute.Sitemap = [];
  try {
    const contractors = await fetchSitemapContractors();
    contractorPages = contractorProfileSitemapEntries(base, contractors);
  } catch (err) {
    console.error("[sitemap contractors]", err);
  }

  let helpPages: MetadataRoute.Sitemap = [];
  try {
    const helpRequests = await fetchSitemapHelpRequests();
    helpPages = helpRequestSitemapEntries(base, helpRequests);
  } catch (err) {
    console.error("[sitemap help]", err);
  }

  return [
    ...staticPages,
    ...calculatorPages,
    ...servicePages,
    ...troubleshootingPages,
    ...categoryPages,
    ...listingPages,
    ...projectPages,
    ...contractorPages,
    ...helpPages,
  ];
}
