import Link from "next/link";
import {
  helpCategoryEmoji,
  helpCategoryLabel,
} from "@/lib/help-categories";
import { formatHelpDistance } from "@/lib/help-requests-shared";
import type { HelpRequestWithDistance } from "@/lib/help-requests-shared";
import { brand } from "@/lib/brand-theme";

export function HomeOpenHelpRequests({
  requests,
  totalCount,
  isLoggedIn,
}: {
  requests: HelpRequestWithDistance[];
  totalCount: number;
  isLoggedIn: boolean;
}) {
  if (totalCount === 0 && requests.length === 0) return null;

  const preview = requests.slice(0, 3);
  const countLabel =
    totalCount > preview.length
      ? `${totalCount} (näytetään ${preview.length})`
      : String(totalCount);

  return (
    <section className="border-t border-stone-200 bg-gradient-to-b from-rose-50/30 to-white py-12 sm:py-14">
      <div className={brand.containerWide}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-rose-800">
              Pieni apu
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
              Avoimia apupyyntöjä: {countLabel}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-stone-600">
              Vapaaehtoista naapuriapua — ei hintaa. Auttajaksi pitää rekisteröityä;
              {isLoggedIn
                ? " pyytäjän yhteystiedot näkyvät kirjautuneille."
                : " yhteystiedot avautuvat kirjautumisen jälkeen."}
            </p>
          </div>
          <Link
            href="/apu"
            className={`${brand.btnSecondary} shrink-0 ${brand.btnSecondaryBlock}`}
          >
            Näytä kaikki
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {preview.map((r) => (
            <li key={r.id}>
              <Link
                href={`/apu/${r.id}`}
                className="block h-full rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-rose-200 hover:bg-rose-50/40 hover:shadow-sm"
              >
                {r.urgency === "now" && (
                  <span className="mb-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-800">
                    Kiire
                  </span>
                )}
                <p className="text-xs font-medium text-stone-500">
                  {helpCategoryEmoji(r.category)} {helpCategoryLabel(r.category)}
                  {r.municipality ? ` · ${r.municipality}` : ""}
                  {r.distance_km != null
                    ? ` · ${formatHelpDistance(r.distance_km)}`
                    : ""}
                </p>
                <p className="mt-1 font-semibold text-stone-900 line-clamp-2">
                  {r.title}
                </p>
                <p className="mt-2 text-xs text-stone-600 line-clamp-2">
                  {r.description}
                </p>
                <p className="mt-2 text-xs font-medium text-rose-800">
                  ❤️ Vapaaehtoinen · 0 €
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
