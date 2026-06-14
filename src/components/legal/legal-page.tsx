import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { siteConfig } from "@/lib/site-config";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} flex-1`}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">Päivitetty: {updated}</p>
        <article className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-stone-700">
          {children}
        </article>
        <p className="mt-10 text-sm text-stone-500">
          Kysymykset:{" "}
          <a
            href={`mailto:${siteConfig.privacyEmail}`}
            className="text-sky-700 hover:underline"
          >
            {siteConfig.privacyEmail}
          </a>
        </p>
      </main>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id}>
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
