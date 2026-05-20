import type { Metadata } from "next";
import Link from "next/link";
import { MarketplacePricingFaq } from "@/components/marketplace/pricing-faq";
import { MarketplacePricingSection } from "@/components/marketplace/pricing-section";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { MARKETPLACE_INVOICE_EMAIL } from "@/lib/marketplace-pricing";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Hinnasto — ${marketplaceBrand.nameShort}`,
  description:
    "Torin hinnat: ilmainen myynti yksityishenkilölle, urakoitsijan kk-paketit ja yksittäiset ilmoitukset.",
  path: "/markkinapaikka/hinnasto",
});

export default async function MarketplacePricingPage() {
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50/40 to-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Hinnasto</h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Hinnat sisältävät ALV:n lisättävän määrän laskulla. Maksut kirjataan
          manuaalisesti — lähetämme laskun osoitteeseen{" "}
          <a
            href={`mailto:${MARKETPLACE_INVOICE_EMAIL}`}
            className="font-medium text-sky-700 hover:underline"
          >
            {MARKETPLACE_INVOICE_EMAIL}
          </a>
          .
        </p>

        <div id="yritykset" className="mt-10 scroll-mt-8">
          <MarketplacePricingSection showConsumer={!contractor} />
        </div>

        <MarketplacePricingFaq />

        <section className="mt-12 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
          <h2 className="font-semibold text-stone-900">Erot tarjouskilpailuun</h2>
          <p className="mt-2 leading-relaxed">
            <strong>Tarjouskilpailu</strong> on asiakkaan pyyntö asennuksesta; urakoitsija
            maksaa välityspalkkion, kun tarjous hyväksytään.{" "}
            <strong>{marketplaceBrand.name}</strong> on laitteiden ja osien myyntiin —
            erillinen
            hinnoittelu (kk tai ilmoitus). Molemmat laskutetaan samalla tavalla ilman
            verkkomaksua sovelluksessa.
          </p>
        </section>
      </main>
    </div>
  );
}
