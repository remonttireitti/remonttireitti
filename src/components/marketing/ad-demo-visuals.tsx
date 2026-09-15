"use client";

import type { AdSceneVisual } from "@/lib/ad-demo-scenes";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="ad-logo-grad" x1="4" y1="4" x2="36" y2="36">
          <stop stopColor="#0284c7" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="ad-route-grad" x1="8" y1="28" x2="32" y2="12">
          <stop stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ad-logo-grad)" />
      <path
        d="M10 19.5 20 11l10 8.5V29H10v-9.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M14 26.5c3-4 9-4 12 0"
        stroke="url(#ad-route-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="24" r="2" fill="#ea580c" />
    </svg>
  );
}

export function AdDemoVisual({
  visual,
  active,
}: {
  visual: AdSceneVisual;
  active: boolean;
}) {
  const pulse = active ? "ad-visual-active" : "opacity-40 scale-95";

  switch (visual) {
    case "hook-problem":
      return (
        <div className={`relative mx-auto h-40 w-40 transition-all duration-700 ${pulse}`}>
          <div className="absolute inset-0 rotate-6 rounded-2xl bg-stone-200 shadow-lg ad-float-slow" />
          <div className="absolute inset-0 -rotate-3 rounded-2xl bg-white p-4 shadow-xl ad-float">
            <div className="space-y-2">
              <div className="h-2 w-16 rounded bg-stone-300" />
              <div className="h-2 w-full rounded bg-stone-200" />
              <div className="h-2 w-3/4 rounded bg-stone-200" />
              <div className="mt-4 h-8 w-8 rounded-full bg-amber-100 text-center text-lg leading-8">
                ?
              </div>
            </div>
          </div>
        </div>
      );

    case "hook-work":
      return (
        <div className={`relative mx-auto h-44 w-36 transition-all duration-700 ${pulse}`}>
          <div className="absolute inset-x-0 top-0 rounded-[2rem] border-4 border-stone-800 bg-stone-900 p-2 shadow-2xl ad-float">
            <div className="rounded-[1.4rem] bg-gradient-to-b from-sky-50 to-white p-3">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-stone-300" />
              <div className="rounded-xl bg-sky-100 p-3 text-left">
                <p className="text-[10px] font-semibold text-sky-900">Uusi tarjouspyyntö</p>
                <p className="mt-1 text-[9px] text-sky-800">Keittiöremontti · Helsinki</p>
              </div>
              <div className="mt-2 flex justify-center">
                <span className="inline-flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-orange-600 text-white">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      );

    case "logo":
      return (
        <div className={`flex flex-col items-center gap-4 transition-all duration-700 ${pulse}`}>
          <LogoMark className="h-24 w-24 ad-pop" />
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-sky-500 to-orange-500 ad-expand" />
        </div>
      );

    case "guided-form":
      return (
        <div className={`mx-auto w-full max-w-xs rounded-2xl border border-sky-200 bg-white p-4 shadow-xl transition-all duration-700 ${pulse}`}>
          <div className="mb-3 flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full ${n <= 2 ? "bg-sky-600" : "bg-sky-100"}`}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-sky-50 ring-1 ring-sky-200 ad-type-line" />
            <div className="h-8 rounded-lg bg-stone-50 ring-1 ring-stone-200 ad-type-line-delay" />
            <div className="h-8 rounded-lg bg-stone-50 ring-1 ring-stone-200 ad-type-line-delay-2" />
          </div>
          <div className="mt-4 inline-flex rounded-full bg-orange-700 px-4 py-2 text-xs font-semibold text-white ad-pop">
            Seuraava →
          </div>
        </div>
      );

    case "compare-bids":
      return (
        <div className={`grid w-full max-w-sm grid-cols-3 gap-2 transition-all duration-700 ${pulse}`}>
          {[
            { price: "12 400 €", highlight: false },
            { price: "11 200 €", highlight: true },
            { price: "13 100 €", highlight: false },
          ].map((bid, i) => (
            <div
              key={bid.price}
              className={`rounded-xl border p-3 text-center shadow-sm ad-bid-card ad-bid-card-${i + 1} ${
                bid.highlight
                  ? "border-orange-300 bg-orange-50 ring-2 ring-orange-400"
                  : "border-stone-200 bg-white"
              }`}
            >
              <p className="text-[10px] font-medium text-stone-500">Tarjous {i + 1}</p>
              <p className="mt-2 text-sm font-bold text-stone-900">{bid.price}</p>
            </div>
          ))}
        </div>
      );

    case "free-badge":
      return (
        <div className={`relative transition-all duration-700 ${pulse}`}>
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-2xl ad-pop">
            <div className="text-center">
              <p className="text-4xl font-black">0 €</p>
              <p className="text-xs font-semibold uppercase tracking-wide">Asiakkaalle</p>
            </div>
          </div>
        </div>
      );

    case "quality-request":
      return (
        <div className={`mx-auto w-full max-w-xs rounded-2xl border border-sky-200 bg-white p-4 shadow-xl transition-all duration-700 ${pulse}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-800">Laatupiste</p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              82 / 100
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 ad-progress-fill" />
          </div>
          <ul className="mt-4 space-y-2 text-left text-[10px] text-stone-600">
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Työn laajuus kuvattu</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Kuvat liitetty</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Aikataulu selvä</li>
          </ul>
        </div>
      );

    case "submit-bid":
      return (
        <div className={`mx-auto w-full max-w-xs transition-all duration-700 ${pulse}`}>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
            <p className="text-xs font-semibold text-stone-800">Tarjous lähetetty</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">9 800 €</p>
            <p className="mt-2 text-[10px] text-stone-500">Maksu vain voitetusta diilistä</p>
          </div>
          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-2xl text-white shadow-lg ad-pop">
            ✓
          </div>
        </div>
      );

    case "area-map":
      return (
        <div className={`relative mx-auto h-40 w-56 transition-all duration-700 ${pulse}`}>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-100 to-orange-50 ring-1 ring-sky-200" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-400/40 bg-sky-400/10 ad-pulse-ring" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg">
              📍
            </span>
          </div>
          {[
            { top: "18%", left: "22%" },
            { top: "62%", left: "68%" },
            { top: "28%", left: "72%" },
          ].map((pos, i) => (
            <span
              key={i}
              className={`absolute h-3 w-3 rounded-full bg-sky-600 ad-map-dot ad-map-dot-${i + 1}`}
              style={{ top: pos.top, left: pos.left }}
            />
          ))}
        </div>
      );

    case "cta-customer":
      return (
        <div className={`flex flex-col items-center gap-4 transition-all duration-700 ${pulse}`}>
          <LogoMark className="h-16 w-16 ad-pop" />
          <div className="rounded-full bg-orange-700 px-6 py-3 text-sm font-bold text-white shadow-lg ad-pop">
            Jätä tarjouspyyntö
          </div>
        </div>
      );

    case "cta-contractor":
      return (
        <div className={`flex flex-col items-center gap-4 transition-all duration-700 ${pulse}`}>
          <LogoMark className="h-16 w-16 ad-pop" />
          <div className="rounded-full bg-orange-700 px-6 py-3 text-sm font-bold text-white shadow-lg ad-pop">
            Rekisteröidy urakoitsijaksi
          </div>
        </div>
      );

    default:
      return null;
  }
}
