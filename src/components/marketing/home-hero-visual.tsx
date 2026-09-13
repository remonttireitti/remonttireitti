const JOB = {
  title: "Keittiöremontti",
  location: "Helsinki",
  posted: "Julkaistu eilen",
} as const;

const BIDS = [
  {
    initials: "RO",
    company: "Rakennus Oy",
    amount: 12_400,
    amountLabel: "12 400 €",
    rating: 4.8,
    weeks: "4–5 vk",
    highlight: true,
  },
  {
    initials: "RP",
    company: "Remontti Pro",
    amount: 13_800,
    amountLabel: "13 800 €",
    rating: 4.6,
    weeks: "5–6 vk",
    highlight: false,
  },
  {
    initials: "PU",
    company: "Paikallinen Urakointi",
    amount: 14_200,
    amountLabel: "14 200 €",
    rating: 4.9,
    weeks: "4 vk",
    highlight: false,
  },
] as const;

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3 w-3 ${i < full || (i === full && partial) ? "fill-current" : "fill-stone-200"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function HomeHeroVisual() {
  const maxAmount = Math.max(...BIDS.map((b) => b.amount));

  return (
    <div className="relative mx-auto w-full max-w-md overflow-x-clip lg:max-w-none">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-orange-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-4 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-sky-100/60 ring-1 ring-stone-200/60">
        <div className="border-b border-stone-100 bg-gradient-to-r from-sky-50/90 via-white to-orange-50/40 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">
                Esimerkki tarjouspyyntö
              </p>
              <p className="mt-1 truncate text-lg font-bold text-stone-900">{JOB.title}</p>
              <p className="text-xs text-stone-500">
                {JOB.location} · {JOB.posted}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/80">
              0 €
            </span>
          </div>
        </div>

        <div className="relative px-4 py-4 sm:px-5 sm:py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:absolute sm:right-0 sm:top-0 sm:mb-0 sm:max-w-[11rem]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-md ring-1 ring-sky-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              3 tarjousta saapui
            </span>
          </div>

          <p className="text-sm font-semibold text-stone-900 sm:pr-28">
            Vertaa hintoja samassa muodossa
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            Urakoitsijat vastaavat valmiiseen pyyntöön — ei turhia kysymyksiä.
          </p>

          <ul className="mt-4 space-y-3" aria-label="Esimerkkitarjoukset">
            {BIDS.map((bid) => {
              const widthPct = Math.round((bid.amount / maxAmount) * 100);
              return (
                <li
                  key={bid.company}
                  className={`rounded-xl border p-3 transition-colors ${
                    bid.highlight
                      ? "border-emerald-200 bg-emerald-50/60 ring-1 ring-emerald-100"
                      : "border-stone-100 bg-stone-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        bid.highlight
                          ? "bg-emerald-600 text-white"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {bid.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-stone-900">
                          {bid.company}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-stone-900">
                          {bid.amountLabel}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/80">
                        <div
                          className={`h-full rounded-full ${
                            bid.highlight ? "bg-emerald-500" : "bg-sky-400"
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-stone-500">
                        <span className="inline-flex items-center gap-1">
                          <StarRow rating={bid.rating} />
                          <span className="font-medium text-stone-600">{bid.rating}</span>
                        </span>
                        <span>Arvio · {bid.weeks}</span>
                      </div>
                    </div>
                  </div>
                  {bid.highlight && (
                    <p className="mt-2 text-[11px] font-semibold text-emerald-800">
                      Edullisin · voit tingata vastatarjouksella
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-center xs:grid-cols-3 min-[400px]:grid-cols-3">
            <div className="min-[400px]:border-r min-[400px]:border-stone-200/80 min-[400px]:pr-2">
              <p className="text-lg font-bold text-stone-900">0 €</p>
              <p className="text-xs leading-tight text-stone-500">Asiakkaalle</p>
            </div>
            <div className="min-[400px]:px-2">
              <p className="text-lg font-bold text-stone-900">3</p>
              <p className="text-xs leading-tight text-stone-500">Tarjousta</p>
            </div>
            <div className="min-[400px]:border-l min-[400px]:border-stone-200/80 min-[400px]:pl-2">
              <p className="text-lg font-bold text-stone-900">48 h</p>
              <p className="text-xs leading-tight text-stone-500">Tyypillinen vastaus</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-stone-500 lg:text-left">
        Esimerkki — oikeat hinnat ja ajat riippuvat työstä ja alueesta
      </p>
    </div>
  );
}
