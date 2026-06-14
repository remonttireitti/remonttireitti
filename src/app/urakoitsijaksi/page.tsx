import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlatformFeeTable } from "@/components/pricing/platform-fee-table";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/urakoitsijaksi")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/urakoitsijaksi",
  keywords: seo.keywords,
});

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">
        {n}
      </span>
      <div>
        <h3 className="font-semibold text-stone-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{body}</p>
      </div>
    </div>
  );
}

export default async function ContractorLandingPage() {
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <div className="mb-6 flex justify-center">
            <Logo href="/" size="lg" />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest text-sky-700">
            Urakoitsijalle
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Uusia remonttikeikkoja —{" "}
            <span className="text-sky-700">maksat vain voitetusta diilistä</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            Remonttireitti kokoaa valmiit tarjouspyynnöt omakotitaloihin:
            lämpöpumput, keittiöt, sähkö, LVI ja muut remontit. Ilmoitukset
            valitsemillesi ammateille. Tarjous on maksuton — välityspalkkio
            tulee vasta, kun asiakas hyväksyy sinut.
          </p>
          <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            {contractor ? (
              <Link
                href="/tarjoukset"
                className="inline-flex items-center justify-center rounded-full bg-orange-700 px-8 py-3 font-medium text-white hover:bg-orange-800"
              >
                Avoimet tarjouspyynnöt
              </Link>
            ) : (
              <Link
                href="/rekisteroidy?rooli=urakoitsija"
                className="inline-flex items-center justify-center rounded-full bg-orange-700 px-8 py-3 font-medium text-white hover:bg-orange-800"
              >
                Rekisteröidy ilmaiseksi
              </Link>
            )}
            <Link
              href="/markkinapaikka/hinnasto#valityspalkkio"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-8 py-3 font-medium text-stone-700 hover:bg-stone-50"
            >
              Välityspalkkiot
            </Link>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-white py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Miksi Remonttireitti?</h2>
            <ul className="mt-6 space-y-4 text-sm leading-relaxed text-stone-700">
              <li className="flex gap-2">
                <span className="text-sky-600" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong>Valmiit pyynnöt</strong> — asiakas on kuvannut kohteen
                  ja liittänyt kuvat. Lämpöpumpuissa tarkempi lomake.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-sky-600" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong>Vastatarjoukset</strong> — asiakas voi ehdottaa
                  alempaa hintaa. Voit hyväksyä, hylätä tai vastata uudella
                  tarjouksella.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-sky-600" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong>Ilmoitukset oikeista töistä</strong> — valitset
                  profiiliin ammatit (sähkö, putki, kirvesmies…) ja halutessasi
                  lämpöpumput.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-sky-600" aria-hidden>
                  ✓
                </span>
                <span>
                  <strong>{marketplaceBrand.name}</strong> erikseen — myy laitteita
                  ja varaosia kk- tai ilmoitusmaksulla (ks. hinnasto).
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-50 py-14">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Näin se toimii</h2>
            <div className="mt-8 space-y-6">
              <Step
                n="1"
                title="Rekisteröidy ja valitse ammatit"
                body="Kerro mille töille tarjoat — saat vain niihin sopivat ilmoitukset."
              />
              <Step
                n="2"
                title="Jätä tarjous maksutta"
                body="Avaa pyyntö, lue tiedot ja kuvat, jätä tarjous laite-, työ- ja takuutiedoilla."
              />
              <Step
                n="3"
                title="Asiakas valitsee — maksat välityspalkkion"
                body="Kun asiakas hyväksyy tarjouksesi, saat laskun. Maksun jälkeen näet yhteystiedot ja voit sopia asennuksesta."
              />
            </div>
          </div>
        </section>

        <section
          id="valityspalkkio"
          className="border-t border-stone-200 bg-white py-14 scroll-mt-20"
        >
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold">Välityspalkkio (veroton + ALV)</h2>
            <p className="mt-2 text-sm text-stone-600">
              Taulukon hinnat ovat verottomia. Arvonlisävero lisätään
              kevytyrittäjä-laskulle. Summa määräytyy pumpputyypin ja tarjoajien
              määrän mukaan hyväksyntähetkellä.
            </p>
            <PlatformFeeTable className="mt-6" />
          </div>
        </section>

        <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/50 to-stone-50 py-14">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-xl font-bold">Aloita tänään</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
              Rekisteröityminen on ilmainen. Ensimmäiset tarjouspyynnöt näet heti
              profiilin täytön jälkeen.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {!contractor && (
                <Link
                  href="/rekisteroidy?rooli=urakoitsija"
                  className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
                >
                  Luo urakoitsijatili
                </Link>
              )}
              <Link href="/" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
                Takaisin etusivulle
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
