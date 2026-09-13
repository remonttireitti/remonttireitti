import Link from "next/link";
import { brand } from "@/lib/brand-theme";

const steps = [
  {
    step: "1",
    title: "Täytä ohjattu pyyntö",
    body: "Valitse työ, seuraa ohjetta ja täydennä laatupisteen avulla — pohja oppii työlajeittain.",
  },
  {
    step: "2",
    title: "Vertaile ja tingaa",
    body: "Sama muoto — tingaa vastatarjouksella.",
  },
  {
    step: "3",
    title: "Valitse tekijä",
    body: "Hyväksy tarjous. Yhteystiedot avautuvat maksun jälkeen.",
  },
] as const;

export function HomeHowItWorks() {
  return (
    <section
      id="nain-toimii"
      className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
        Näin se toimii
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
        Pyyntö → tarjoukset → vertailu → valinta
      </h2>
      <ol className="mt-6 space-y-4">
        {steps.map((s) => (
          <li key={s.step} className="flex gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800"
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

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/remontti/uusi"
          className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
        >
          Jätä tarjouspyyntö – maksutta
        </Link>
        <Link href="/vian-selvitys" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
          Lämpöpumppu oireilee?
        </Link>
      </div>
    </section>
  );
}
