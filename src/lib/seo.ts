import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export function getSiteUrl(): string {
  const url = siteConfig.siteUrl;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const defaultTitle = `${siteConfig.name} — Kilpailuta lämpöpumppu ilmaiseksi`;
const defaultDescription =
  "Kilpailuta ilmalämpö-, vesi-ilmalämpö- tai maalämpöpumppu. Useita tarjouksia asentajilta — ilmainen tarjouspyyntö.";

/** Juuri-layoutin metadata (metadataBase, OG-oletukset). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: defaultDescription,
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
  openGraph: {
    type: "website",
    locale: "fi_FI",
    siteName: siteConfig.name,
    title: defaultTitle,
    description: defaultDescription,
    url: getSiteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
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
    },
    twitter: {
      card: "summary",
      title: ogTitle,
      description,
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
