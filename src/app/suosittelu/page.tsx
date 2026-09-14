import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { REFERRAL_FREE_DEALS_PER_REFERRAL } from "@/lib/contractor-referral";
import { formatPlatformFee, payPerDealFeeCents } from "@/lib/platform-fee";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";
import { siteConfig } from "@/lib/site-config";

const seo = seoDefByPath("/suosittelu")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/suosittelu",
  keywords: seo.keywords,
});

function ReferralCard({
  title,
  audience,
  children,
}: {
  title: string;
  audience: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
        {audience}
      </p>
      <h2 className="mt-2 text-xl font-bold text-stone-900">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
        {children}
      </div>
    </section>
  );
}

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export default async function ReferralInfoPage() {
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;
  const bonusAmount = formatPlatformFee(payPerDealFeeCents());
  const encodedEmail = user?.email ? encodeURIComponent(user.email) : null;
  const customerReferralUrl = encodedEmail
    ? `${siteConfig.siteUrl}/rekisteroidy?suosittelija=${encodedEmail}`
    : null;
  const contractorReferralUrl = encodedEmail
    ? `${siteConfig.siteUrl}/rekisteroidy?rooli=urakoitsija&suosittelija=${encodedEmail}`
    : null;

  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} flex-1 pb-16`}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>

        <p className="mt-4 text-sm font-medium uppercase tracking-widest text-sky-700">
          Suosittelu
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Suosittelubonus
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600">
          Kun tuot uuden käyttäjän Remonttireittiin, saat hyödyn kun hän tekee
          ensimmäisen onnistuneen diilin. Bonukset eivät päällekkäisty — urakoitsijan
          oma etu (beta, tilaus tai urakoitsijasuosittelu) menee aina ensin.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <ReferralCard title="Suosittele asiakasta" audience="Asiakkaalle">
            <p>
              Kun rekisteröitynyt asiakas suosittelee toista asiakasta ja tämän
              urakka johtaa hyväksyttyyn tarjoukseen, suosittelija saa{" "}
              <strong className="text-stone-800">{bonusAmount}</strong> bonuksen
              omaan seuraavaan remonttiin.
            </p>
            <StepList
              items={[
                "Jaa rekisteröitymislinkki tai pyydä ystävää antamaan sähköpostisi rekisteröityessä.",
                "Suosittelun bonuksen saat, kun suosittelemasi asiakkaan tarjous hyväksytään.",
                "Bonuksen käytät omassa remontissa: urakoitsija alentaa hintaa vastaavasti, kun hän maksaisi muuten välityspalkkion.",
              ]}
            />
            {!contractor && (
              <p className="text-stone-500">
                Bonusta ei voi käyttää samalla diilillä, jos valitsemasi urakoitsija
                saa jo ilmaisen diilin (esim. beta-etu). Bonus säilyy seuraavaan
                kertaan.
              </p>
            )}
          </ReferralCard>

          <ReferralCard title="Suosittele urakoitsijaa" audience="Asiakkaalle">
            <p>
              Voit suositella myös uutta urakoitsijaa. Kun hän voittaa ensimmäisen
              diilinsä alustalla, saat saman{" "}
              <strong className="text-stone-800">{bonusAmount}</strong> bonuksen
              omaan remonttiin.
            </p>
            <StepList
              items={[
                "Urakoitsija antaa sähköpostisi rekisteröityessä suosittelijaksi.",
                "Bonus kertyy, kun suosittelemasi urakoitsija voittaa diilin.",
                "Käytät bonuksen omassa hyväksytyssä urakassa samalla tavalla kuin asiakassuosittelussa.",
              ]}
            />
          </ReferralCard>

          <ReferralCard
            title="Suosittele toista urakoitsijaa"
            audience="Urakoitsijalle"
          >
            <p>
              Jokaisesta tuomastasi uudesta urakoitsijasta saat{" "}
              <strong className="text-stone-800">
                {REFERRAL_FREE_DEALS_PER_REFERRAL} ilmaista diiliä
              </strong>
              . Ne vähennetään automaattisesti seuraavista voitetuista urakoista.
            </p>
            <StepList
              items={[
                "Uusi urakoitsija antaa sähköpostisi pakollisena suosittelijana rekisteröityessä.",
                "Kun hän voittaa diilejä, sinulle kertyy ilmaisia diilejä (2 kpl per suosittelu).",
                "Ilmaiset diilit käytetään ennen maksettua välityspalkkiota.",
              ]}
            />
            <p>
              <Link href="/urakoitsijaksi" className="font-medium text-sky-700 hover:underline">
                Lue lisää urakoitsijaksi liittymisestä →
              </Link>
            </p>
          </ReferralCard>

          <ReferralCard title="Miten bonus toimii käytännössä" audience="Yhteistä">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Asiakasbonus vastaa yhden välityspalkkion verotonta summaa (
                {bonusAmount}) ja alentaa asiakkaan maksettavaa hintaa.
              </li>
              <li>
                Urakoitsijabonus tarkoittaa 0 € välityspalkkiolaskua — ei alennusta
                asiakkaan hinnasta.
              </li>
              <li>
                Bonukset myönnetään kerran per suosittelusuhde, kun ehto täyttyy
                (hyväksytty tarjous / voitettu diili).
              </li>
              <li>
                Saatavilla olevat asiakasbonukset näkyvät{" "}
                <Link href="/oma-tili" className="font-medium text-sky-700 hover:underline">
                  Oma tili
                </Link>
                -sivulla.
              </li>
            </ul>
          </ReferralCard>
        </div>

        {user && encodedEmail && (
          <section className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <h2 className="text-lg font-semibold text-stone-900">
              Oma suosittelulinkkisi
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Jaa linkki, jossa sähköpostisi ({user.email}) on valmiina
              suosittelijakentässä.
            </p>
            <div className="mt-4 space-y-3">
              {!contractor && customerReferralUrl && (
                <div>
                  <p className="text-xs font-medium text-stone-700">
                    Asiakkaan rekisteröityminen
                  </p>
                  <code className="mt-1 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-stone-800 ring-1 ring-stone-200">
                    {customerReferralUrl}
                  </code>
                </div>
              )}
              {contractorReferralUrl && (
                <div>
                  <p className="text-xs font-medium text-stone-700">
                    Urakoitsijan rekisteröityminen
                  </p>
                  <code className="mt-1 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-stone-800 ring-1 ring-stone-200">
                    {contractorReferralUrl}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}

        {!user && (
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/rekisteroidy"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
            >
              Luo tili ja aloita suosittelu
            </Link>
            <Link
              href="/kirjaudu"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Kirjaudu sisään
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
