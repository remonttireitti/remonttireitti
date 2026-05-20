/** Sininen + oranssi bränditeema (Tailwind-luokat). */
export const brand = {
  input:
    "focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20",
  selectedCard:
    "border-sky-600 bg-sky-50 ring-1 ring-sky-600/80",
  cardIdle:
    "border-stone-200 bg-stone-50/50 hover:border-sky-200 hover:bg-white",
  checkbox: "rounded border-stone-300 text-sky-600 focus:ring-sky-500/30",
  section:
    "rounded-2xl border border-sky-100/80 bg-white shadow-sm ring-1 ring-sky-900/5",
  page:
    "min-h-full bg-gradient-to-b from-sky-50/50 via-white to-stone-50/80 text-stone-900",
  hero:
    "relative overflow-hidden rounded-3xl border border-sky-100/80 bg-gradient-to-br from-sky-50/90 via-white to-orange-50/50 px-5 py-12 shadow-sm ring-1 ring-sky-900/5 sm:px-10 sm:py-16",
  sectionHeader:
    "border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-orange-50/70 px-5 py-4",
  sectionTitle: "text-sm font-semibold tracking-tight text-sky-950",
  sectionDesc: "mt-1 text-xs leading-relaxed text-stone-700",
  btnPrimary:
    "touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-2xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.98]",
  btnSecondary:
    "touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-2xl border border-sky-200/90 bg-white px-6 py-3 text-sm font-semibold text-sky-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 active:scale-[0.98]",
  /** Pinottu mobiilissa, rivi tabletilla+ */
  actionsStack: "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap",
  /** Otsikko + toiminto — pino mobiilissa */
  pageHeaderRow:
    "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
  btnPrimaryBlock:
    "inline-flex w-full items-center justify-center sm:w-auto",
  btnSecondaryBlock:
    "inline-flex w-full items-center justify-center sm:w-auto",
  link: "text-sky-800 hover:text-sky-950 hover:underline",
  estimateBox:
    "rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50/90 to-orange-50/50 px-3 py-3 text-sm text-sky-950",
  infoBox:
    "rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs text-sky-900",
  savingsBox:
    "rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900",
  compareBarFuture: "bg-gradient-to-r from-sky-500 to-sky-600",
  compareBarPast: "bg-stone-400",
  stepActive: "bg-sky-700 text-white shadow-sm",
  stepDone: "bg-orange-100 text-orange-900",
  stepTodo: "bg-stone-100 text-stone-600",
  ctaHeader: "rounded-full bg-orange-600 px-4 py-2 text-white hover:bg-orange-700",
  badge: "rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900",
  successText: "text-sm text-sky-800",
  alertBox: "rounded-lg bg-sky-50 p-3 text-sm text-sky-900",
  panel: "rounded-2xl border border-sky-200 bg-sky-50/60 p-6",
  panelTitle: "font-semibold text-sky-950",
  panelText: "text-sm text-sky-800",
  cardHover: "hover:border-sky-300",
  checkedLabel:
    "has-checked:border-sky-600 has-checked:bg-sky-50",
} as const;

/** Yleinen lomakekentän focus-tyyli (ei spin-nappuloita). */
export const legacyFormInputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export const formInputClass =
  `mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm ${brand.input} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;
