import type { Metadata } from "next";
import Link from "next/link";
import { CustomerLandingContent } from "@/components/marketing/customer-landing-content";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/asiakkaalle")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/asiakkaalle",
  keywords: seo.keywords,
});

export default function CustomerLandingPage() {
  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>
        <div className="mt-6">
          <CustomerLandingContent />
        </div>
      </main>
    </div>
  );
}
