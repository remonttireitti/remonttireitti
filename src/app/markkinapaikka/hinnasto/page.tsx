import type { Metadata } from "next";
import Link from "next/link";
import { MarketplacePricingFaq } from "@/components/marketplace/pricing-faq";
import { MarketplacePricingSection } from "@/components/marketplace/pricing-section";
import { PlatformFeeTable } from "@/components/pricing/platform-fee-table";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { MARKETPLACE_INVOICE_EMAIL } from "@/lib/marketplace-pricing";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/lib/brand-theme";

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
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Hinnasto</h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Yrityshinnat ovat verottomia; ALV lisätään laskulle. Maksut kirjataan
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

        <section
          id="valityspalkkio"
          className="mt-12 scroll-mt-8 rounded-xl border border-sky-100 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-stone-900">
            Tarjouskilpailun välityspalkkio (urakoitsija)
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Maksat vain, kun asiakas hyväksyy tarjouksesi. Summa riippuu
            pumpputyypistä ja siitä, montako tarjousta pyyntöön on kertynyt
            hyväksyntähetkellä.
          </p>
          <PlatformFeeTable className="mt-4" />
        </section>

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
