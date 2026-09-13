import Link from "next/link";
import { brand } from "@/lib/brand-theme";

const pillars = [
  {
    title: "Helpoin ohjattu tapa",
    body:
      "Vaiheittainen ohje kertoo mitä kirjoittaa — valitse kohta, teksti lisätään kuvauskenttään. Laatupiste näyttää heti, mitä vielä kannattaa täydentää.",
    accent: "border-violet-200 bg-gradient-to-br from-violet-50/80 to-white ring-violet-100",
    icon: "📝",
  },
  {
    title: "Laadukas pyyntö urakoitsijalle",
    body:
      "Selkeä kuvaus, kuvat, budjetti ja aikataulu — urakoitsija näkee saman rakenteen jokaisessa pyynnössä ja voi tarjota tarkemmin ilman turhia kysymyksiä.",
    accent: "border-sky-200 bg-gradient-to-br from-sky-50/80 to-white ring-sky-100",
    icon: "✓",
  },
  {
    title: "Oppiva tarjouspyyntöpohja",
    body:
      "Alusta muistaa, mitä urakoitsijat usein pyytävät tarkentamaan. Seuraava saman työn pyyntö ehdottaa jo valmiiksi tärkeitä kohtia — pohja paranee käytön myötä.",
    accent: "border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white ring-emerald-100",
    icon: "↻",
  },
] as const;

type Props = {
  hideContractorLink?: boolean;
};

export function HomeQualityRequest({ hideContractorLink = false }: Props) {
  return (
    <section className="border-t border-stone-200 bg-white py-14 sm:py-16">
      <div className={brand.containerWide}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-800">
            Laadukas tarjouspyyntö
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Selkeä pyyntö urakoitsijalle — helpoin ohjattu tapa tehdä se
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
            Suppea WhatsApp-viesti tuottaa epätarkkoja tarjouksia. Remonttireitin
            ohjattu lomake ja laatupiste auttavat kuvaamaan työn kerralla
            oikein — ja pohja oppii työlajeittain.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className={`rounded-2xl border p-5 shadow-sm ring-1 ${p.accent}`}
            >
              <span className="text-xl" aria-hidden>
                {p.icon}
              </span>
              <h3 className="mt-3 font-semibold text-stone-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/remontti/uusi" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}>
            Kokeile ohjattua pyyntöä
          </Link>
          {!hideContractorLink && (
            <Link
              href="/urakoitsijaksi"
              className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
            >
              Urakoitsijalle: Tarjousavustaja →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
