type ValuePromoVariant = "customer-negotiate" | "contractor-pay-on-win";

const COPY: Record<
  ValuePromoVariant,
  { title: string; body: string; accent: "sky" | "orange" }
> = {
  "customer-negotiate": {
    title: "Hinta tuntuu kalliilta?",
    body: "Voit ehdottaa alhaisempaa hintaa vastatarjouksella ennen kuin hyväksyt tarjouksen. Neuvottelu on osa vertailua.",
    accent: "orange",
  },
  "contractor-pay-on-win": {
    title: "Maksat vain todetusta tilauksesta",
    body: "Välityspalkkio veloitetaan vasta hyväksynnän jälkeen — summa riippuu pumpputyypistä ja tarjoajien määrästä (esim. ilmalämpö 20–30 €). Tarjousten jättäminen on maksuton.",
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
  const { title, body, accent } = COPY[variant];
  return (
    <aside
      className={`rounded-xl border p-4 text-sm shadow-sm ${accentClasses[accent]} ${className}`}
      role="note"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed text-stone-800">{body}</p>
    </aside>
  );
}

export function ValuePromoPair({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <ValuePromoBanner variant="customer-negotiate" />
      <ValuePromoBanner variant="contractor-pay-on-win" />
    </div>
  );
}
