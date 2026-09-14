import { fetchPublicOpenProjects } from "@/lib/public-projects-server";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 — avoimet tarjouspyynnöt aggregaattoreille ja crawlers. */
export async function GET() {
  const base = getSiteUrl();
  const projects = await fetchPublicOpenProjects(50);
  const now = new Date().toUTCString();

  const items = projects
    .map((p) => {
      const label = p.job_type_name ?? p.category_name;
      const link = `${base}/tarjouspyynnot/${p.id}`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(`${p.summary} (${label}, ${p.municipality})`)}</description>
      <category>${escapeXml(label)}</category>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)} — avoimet tarjouspyynnöt</title>
    <link>${base}/tarjouspyynnot</link>
    <description>Julkaistut remontti- ja palvelupyynnöt Suomessa</description>
    <language>fi</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${base}/tarjouspyynnot/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
