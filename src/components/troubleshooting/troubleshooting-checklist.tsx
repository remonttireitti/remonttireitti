"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { HeatPumpSlug } from "@/constants/heat-pumps";
import {
  buildTroubleshootingHuoltoQuery,
  resolveCheckForPump,
  type TroubleshootingGuide,
  pumpLabel,
} from "@/lib/troubleshooting-guides";
import { brand } from "@/lib/brand-theme";

export function TroubleshootingChecklist({
  pumpSlug,
  guide,
  loginHref,
}: {
  pumpSlug: HeatPumpSlug;
  guide: TroubleshootingGuide;
  /** Kirjautumaton: /kirjaudu?redirect=... */
  loginHref?: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState(false);

  const triedIds = useMemo(
    () => Object.entries(checked).filter(([, v]) => v).map(([k]) => k),
    [checked],
  );

  const huoltoQuery = buildTroubleshootingHuoltoQuery({
    pumpSlug,
    guide,
    triedCheckIds: triedIds,
  });
  const huoltoHref = `/huolto/uusi?${huoltoQuery}`;
  const ctaHref = loginHref ?? huoltoHref;

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  if (resolved) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">
          Hienoa — ongelma korjaantui
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Jos vika toistuu tai laite on huollon tarpeessa, voit silti pyytää
          tarjouksia asentajilta.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/vian-selvitys"
            className="text-sm font-medium text-sky-800 hover:underline"
          >
            ← Muut oireet
          </Link>
          <Link
            href={ctaHref}
            className={`text-sm font-medium ${brand.link}`}
          >
            Pyydä huoltoa silti →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {guide.pumpNotes?.[pumpSlug] && (
        <p className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-900">
          <span className="font-semibold">{pumpLabel(pumpSlug)}: </span>
          {guide.pumpNotes[pumpSlug]}
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold">Tarkista nämä (turvalliset)</h2>
        <ul className="mt-4 space-y-3">
          {guide.safeChecks.map((c) => {
            const resolved = resolveCheckForPump(c, pumpSlug);
            if (!resolved) return null;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!checked[c.id]}
                    onChange={() => toggle(c.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-stone-900">
                      {resolved.title}
                    </span>
                    <span className="mt-1 block text-sm text-stone-600">
                      {resolved.detail}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <h2 className="text-sm font-semibold text-amber-900">Älä tee itse</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
          {guide.doNotDo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-stone-800">
          Soita / tilaa ammattilainen, jos
        </h2>
        <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
          {guide.callProWhen.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-stone-500">
        Yleinen ohje — ei korvaa valmistajan dokumentaatiota. Kylmäainetyöt ja
        sähkötyöt vain pätevälle asentajalle.
      </p>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setResolved(true)}
          className="rounded-full border border-emerald-600 bg-white px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Ongelma korjaantui
        </button>
        <Link
          href={ctaHref}
          className={`${brand.btnPrimary} rounded-full px-6 py-3 text-center text-sm font-semibold`}
        >
          Ei korjaantunut — kilpailuta huolto
        </Link>
      </div>
      {loginHref && (
        <p className="text-center text-xs text-stone-500">
          Kirjaudu tai rekisteröidy jatkaaksesi huoltopyyntöön.
        </p>
      )}
    </div>
  );
}
