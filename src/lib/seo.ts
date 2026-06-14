import type { Metadata } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/lib/site-config";
import { mergeKeywords, SITE_KEYWORDS } from "@/lib/seo-keywords";

export function getSiteUrl(): string {
  const url = siteConfig.siteUrl;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/** Pyyntökohtainen kanoninen juuri (sitemap, robots) — käyttää oikeaa hostia vaikka env olisi väärin. */
export async function getRequestSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
      .split(",")[0]
      .trim();
    if (host && !host.includes("localhost") && !host.includes("vercel.app")) {
      return `https://${host}`;
    }
  } catch {
    // Staattinen generointi tms.
  }
  return getSiteUrl();
}

const defaultTitle = `${siteConfig.name} — Kilpailuta remontti ja palvelut`;
const defaultDescription =
  "Kilpailuta remontit, asennukset, huolto ja kunnossapito omakotitaloon. Siivous, piha, muutto — myös jatkuva palvelu. Remonttitori laitteille. Ilmainen tarjouspyyntö, vertaa tarjouksia.";

const defaultKeywords = mergeKeywords(SITE_KEYWORDS, [
  "lämpöpumppu",
  "kylpyhuoneremontti",
  "keittiöremontti",
  "remontin kilpailutus",
  "nurmikon leikkuu",
  "remonttitori",
]);

const defaultOgImage = "/opengraph-image";

/** Juuri-layoutin metadata (metadataBase, OG-oletukset). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: defaultDescription,
  keywords: defaultKeywords,
  authors: [{ name: siteConfig.legalName, url: getSiteUrl() }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  category: "construction",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...(siteConfig.googleSiteVerification
    ? {
        verification: {
          google: siteConfig.googleSiteVerification,
        },
      }
    : {}),
  openGraph: {
    type: "website",
    locale: "fi_FI",
    siteName: siteConfig.name,
    title: defaultTitle,
    description: defaultDescription,
    url: getSiteUrl(),
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export function pageMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const canonical = path ? `${getSiteUrl()}${path}` : undefined;
  const ogTitle = title.includes(siteConfig.name)
    ? title
    : `${title} | ${siteConfig.name}`;
  const pageKeywords =
    keywords && keywords.length > 0
      ? mergeKeywords(SITE_KEYWORDS, keywords)
      : undefined;

  return {
    title,
    description,
    keywords: pageKeywords,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "fi_FI",
      type: "website",
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [defaultOgImage],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
  };
}

export const noIndexRobots: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
