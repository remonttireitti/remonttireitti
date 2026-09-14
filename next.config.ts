import type { NextConfig } from "next";

function supabaseImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [
      {
        protocol: "https",
        hostname,
        pathname: "/storage/v1/object/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Ilmoituskuvat: enintään 8 × 5 Mt (+ lomaketeksti)
      bodySizeLimit: "45mb",
    },
    // OpenNext / Cloudflare — suurempi POST-koko server actioneille
    proxyClientMaxBodySize: "45mb",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseImagePatterns(),
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        has: [{ type: "query", key: "favicon" }],
        destination: "/favicon.ico",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/opengraph-image.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/tarjouspyynnot/feed.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
