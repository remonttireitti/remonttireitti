type ValuePromoVariant =
  | "customer-negotiate"
  | "customer-free"
  | "contractor-pay-on-win";

const COPY: Record<
  ValuePromoVariant,
  { audience?: string; title: string; body: string; accent: "sky" | "orange" }
> = {
  "customer-negotiate": {
    audience: "Asiakkaalle",
    title: "Hinta tuntuu kalliilta?",
    body: "Voit ehdottaa alhaisempaa hintaa vastatarjouksella ennen kuin hyväksyt tarjouksen. Neuvottelu on osa vertailua.",
    accent: "orange",
  },
  "customer-free": {
    audience: "Asiakkaalle",
    title: "Sinulle palvelu on ilmainen",
    body: "Kilpailutus ja tarjousten vertailu eivät maksa mitään. Remonttireitti laskuttaa urakoitsijaa — ei sinua. Maksat vain valitsemallesi asentajalle sovitun työn hinnan.",
    accent: "sky",
  },
  "contractor-pay-on-win": {
    audience: "Urakoitsijalle",
    title: "Ensimmäiset 3 diiliä ilman palkkiota",
    body: "Tarjousten jättäminen on maksutonta. Kun asiakas hyväksyy tarjouksesi, ensimmäiset kolme diiliä ovat välityspalkkiota 0 € — yhteystiedot avautuvat heti. Sen jälkeen normaali hinnasto tyypin ja kilpailijoiden mukaan.",
    accent: "sky",
  },
};

const accentClasses = {
  sky: "border-sky-200 bg-gradient-to-br from-sky-50/90 to-white text-sky-950",
  orange:
    "border-orange-200 bg-gradient-to-br from-orange-50/90 to-white text-orange-950",
} as const;

export function ValuePromoBanner({
  variant,
  className = "",
}: {
  variant: ValuePromoVariant;
  className?: string;
}) {
  const { audience, title, body, accent } = COPY[variant];
  return (
    <aside
      className={`rounded-xl border p-4 text-sm shadow-sm ${accentClasses[accent]} ${className}`}
      role="note"
    >
      {audience && (
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {audience}
        </p>
      )}
      <p className={`font-semibold ${audience ? "mt-1" : ""}`}>{title}</p>
      <p className="mt-1 leading-relaxed text-stone-800">{body}</p>
    </aside>
  );
}

export function ValuePromoPair({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <ValuePromoBanner variant="customer-negotiate" />
      <ValuePromoBanner variant="customer-free" />
    </div>
  );
}
