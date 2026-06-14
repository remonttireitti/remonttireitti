import type { Metadata } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/lib/site-config";

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

const defaultTitle = `${siteConfig.name} — Kilpailuta remontti ilmaiseksi`;
const defaultDescription =
  "Kilpailuta remontti, lämmitys ja muut työt omakotitaloon. Useita tarjouksia urakoitsijoilta — ilmainen tarjouspyyntö.";

const defaultOgImage = "/logo.svg";

/** Juuri-layoutin metadata (metadataBase, OG-oletukset). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: defaultDescription,
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
    images: [{ url: defaultOgImage, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = path ? `${getSiteUrl()}${path}` : undefined;
  const ogTitle = title.includes(siteConfig.name)
    ? title
    : `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "fi_FI",
      type: "website",
      images: [{ url: defaultOgImage, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary",
      title: ogTitle,
      description,
      images: [defaultOgImage],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  };
}

export const noIndexRobots: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
