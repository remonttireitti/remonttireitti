import Link from "next/link";
import { brand } from "@/lib/brand-theme";

const installSteps = [
  {
    step: "1",
    title: "Täytä tarkka pyyntö",
    body: "Pumpputyyppi, kuvat ja kohteen tiedot — asentaja voi laskea tarjouksen ilman yllätyksiä.",
  },
  {
    step: "2",
    title: "Vertaile ja tingaa",
    body: "Useita tarjouksia samassa muodossa. Voit ehdottaa omaa hintaa vastatarjouksella.",
  },
  {
    step: "3",
    title: "Valitse asentaja",
    body: "Hyväksy tarjous. Yhteystiedot avautuvat, kun urakoitsija on maksanut välityspalkkion.",
  },
] as const;

const troubleshootSteps = [
  {
    step: "1",
    title: "Valitse laite ja oire",
    body: "Esim. ei lämmitä, vuoto, virhekoodi tai korkea kulutus — pumpputyypeittäin (ILP, VILP, maalämpö).",
  },
  {
    step: "2",
    title: "Tarkista turvalliset asiat",
    body: "Selkeä lista: mitä voit katsoa itse (asetukset, lumi ulkoyksikön ympärillä) ja mitä ei kannata tehdä.",
  },
  {
    step: "3",
    title: "Tilaa huolto tarvittaessa",
    body: "Jos vika jää, siirry suoraan huoltopyyntöön — oire ja kokeilemasi toimet mukana asentajalle.",
  },
] as const;

function StepList({
  steps,
  accent,
}: {
  steps: readonly { step: string; title: string; body: string }[];
  accent: "sky" | "orange";
}) {
  const numClass =
    accent === "sky"
      ? "bg-sky-100 text-sky-800"
      : "bg-orange-100 text-orange-900";

  return (
    <ol className="mt-4 space-y-4">
      {steps.map((s) => (
        <li key={s.step} className="flex gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${numClass}`}
            aria-hidden
          >
            {s.step}
          </span>
          <div>
            <p className="font-medium text-stone-900">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HomeHowItWorks() {
  return (
    <section
      id="nain-toimii"
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
        Näin palvelu toimii
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
        Kolme tapaa käyttää Remonttireittiä
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        Uusi palvelu — emme näytä keksittyjä asiakasarviointeja. Urakoitsijoiden
        tähtiarvostelut tulevat vasta valmiista urakoista.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
          <h3 className="text-lg font-semibold text-stone-900">
            Kilpailuta asennus
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Ilmainen asiakkaalle — useita tarjouksia yhdestä pyynnöstä.
          </p>
          <StepList steps={installSteps} accent="sky" />
          <Link
            href="/remontti/uusi"
            className={`${brand.link} mt-5 inline-block text-sm font-semibold`}
          >
            Aloita asennuspyyntö →
          </Link>
        </article>

        <article className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
          <h3 className="text-lg font-semibold text-stone-900">
            Lämpöpumppu oireilee?
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            <strong>Vian selvitys</strong> tarkoittaa: valitset oireen ja saat
            asentajan kirjoittaman tarkistuslistan ennen kuin tilaat huollon.
            Ei korvaa ammattilaisen käyntiä, mutta auttaa erottamaan yksinkertaiset
            asiat.
          </p>
          <StepList steps={troubleshootSteps} accent="orange" />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/vian-selvitys"
              className={`${brand.link} text-sm font-semibold`}
            >
              Aloita vian selvitys →
            </Link>
            <Link
              href="/huolto/uusi"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 hover:underline"
            >
              Siirry suoraan huoltoon
            </Link>
          </div>
        </article>
      </div>

      <p className="mt-6 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        <strong className="text-stone-800">Tori:</strong> osta tai myy laitteita
        ja varaosia erikseen — ei liity asennus- tai huoltopyyntöön.{" "}
        <Link href="/markkinapaikka" className={brand.link}>
          Selaa toria →
        </Link>
      </p>
    </section>
  );
}
