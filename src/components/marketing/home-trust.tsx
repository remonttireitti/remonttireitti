import { CONTRACTOR_TRUST_POINTS } from "@/lib/contractor-trust";

const icons = ["✓", "◎", "★", "↻"] as const;

export function HomeTrust() {
  return (
    <section
      id="luottamus"
      className="rounded-3xl border border-sky-100/90 bg-gradient-to-br from-white via-sky-50/40 to-orange-50/30 p-6 shadow-sm ring-1 ring-sky-900/5 sm:p-8"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
        Luotettava valinta
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
        Tunnemme urakoitsijat — sinä näet pätevyydet ja arvostelut
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
        Remonttireitti on rakennettu lämpöpumppuille. Urakoitsijat eivät ole
        anonyymejä: pätevyystiedot ja aiemmat arvostelut auttavat vertailua.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {CONTRACTOR_TRUST_POINTS.map((item, i) => (
          <li
            key={item.title}
            className="flex gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-800"
              aria-hidden
            >
              {icons[i]}
            </span>
            <div>
              <h3 className="font-semibold text-stone-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
