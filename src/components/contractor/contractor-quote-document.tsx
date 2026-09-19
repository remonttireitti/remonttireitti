import type { ReactNode } from "react";
import { ContractorQuoteBrandMark } from "@/components/contractor/contractor-quote-brand-mark";
import { formatEuro } from "@/lib/calculators/math";
import {
  CONTRACTOR_QUOTE_THANK_YOU,
  contractorQuoteValidityNote,
  quoteDisplayNumber,
  quoteValidUntilDate,
  type ContractorQuoteDocumentView,
} from "@/lib/contractor-quote-print";
import { quoteVatBreakdown } from "@/lib/contractor-quote-types";
import { vatLabel } from "@/lib/vat-label";

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <section className="rounded-xl border border-orange-200/80 border-t-4 border-t-orange-500 bg-orange-50/70 px-4 py-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-orange-900/80">
        {title}
      </h2>
      <div className="mt-1.5 text-sm leading-relaxed text-stone-800">
        {children}
      </div>
    </section>
  );
}

export function ContractorQuoteDocument({
  data,
}: {
  data: ContractorQuoteDocumentView;
}) {
  const { quote, companyName, businessId, billingAddress, companyDescription } =
    data;
  const totalEuros = quote.total_cents / 100;
  const vat = quoteVatBreakdown(totalEuros, quote.vat_included);
  const lines = quote.line_items.filter((l) => l.enabled && l.amount > 0);
  const validityDays = quote.validity_days ?? 30;
  const dateStr = new Date(quote.created_at).toLocaleDateString("fi-FI");
  const validUntilStr = quoteValidUntilDate(
    quote.created_at,
    validityDays,
  ).toLocaleDateString("fi-FI");
  const quoteNumber = quoteDisplayNumber(quote.id);

  const customerLines = [
    quote.client_name,
    quote.client_email,
    [quote.site_address, quote.site_municipality].filter(Boolean).join(", "),
  ].filter(Boolean);

  const companyMeta = [
    companyName,
    businessId ? `Y-tunnus ${businessId}` : null,
    billingAddress,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="text-stone-900">
      {/* Yrityksen logo + nimi + esittely (profiilista) */}
      <header className="flex flex-col items-center text-center">
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logoUrl}
            alt=""
            className="h-16 max-w-[220px] object-contain"
          />
        ) : null}
        <p
          className={
            data.logoUrl
              ? "mt-2 text-base font-bold tracking-tight text-sky-950"
              : "text-xl font-bold tracking-tight text-sky-950"
          }
        >
          {companyName}
        </p>
        {(companyDescription || companyMeta) && (
          <div className="mt-4 w-full rounded-xl border border-sky-200 border-t-4 border-t-sky-700 bg-sky-50/80 px-4 py-3 text-left">
            {companyDescription ? (
              <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
                {companyDescription}
              </p>
            ) : null}
            {companyMeta ? (
              <p
                className={`text-xs text-stone-600 ${companyDescription ? "mt-2" : ""}`}
              >
                {companyMeta}
              </p>
            ) : null}
          </div>
        )}
      </header>

      {/* Otsikko + päivä / voimassa / numero */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Tarjous
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-snug text-stone-950">
            {quote.title}
          </h1>
        </div>
        <dl className="shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm sm:min-w-[11rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Päivä</dt>
            <dd className="font-medium tabular-nums">{dateStr}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <dt className="text-stone-500">Voimassa</dt>
            <dd className="font-medium tabular-nums">{validUntilStr}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <dt className="text-stone-500">Numero</dt>
            <dd className="font-medium tabular-nums tracking-wide">
              {quoteNumber}
            </dd>
          </div>
        </dl>
      </div>

      {/* Asiakas / kohde */}
      <div className="mt-5 space-y-3">
        {customerLines.length > 0 && (
          <InfoBlock title="Asiakas">
            {customerLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </InfoBlock>
        )}
      </div>

      {/* ALV-tila */}
      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm font-medium text-emerald-900">
        Kaikki hinnat ovat {vatLabel(quote.vat_included)}.
      </p>

      {/* Hinnoittelutaulukko */}
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-sky-800 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
              <th className="px-3 py-2.5 font-semibold">Kuvaus</th>
              <th className="px-3 py-2.5 text-center font-semibold">Määrä</th>
              <th className="px-3 py-2.5 text-right font-semibold">A-hinta</th>
              <th className="px-3 py-2.5 text-right font-semibold">Yhteensä</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-sky-100/80">
              <td
                colSpan={4}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-950"
              >
                Työn sisältö ja hinnat
              </td>
            </tr>
            {lines.map((line, index) => (
              <tr
                key={line.id}
                className={
                  index % 2 === 0
                    ? "bg-white"
                    : "bg-stone-50 border-t border-stone-100"
                }
              >
                <td className="px-3 py-2.5 text-stone-800">{line.label}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-stone-600">
                  1 kpl
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-stone-700">
                  {formatEuro(line.amount)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-stone-900">
                  {formatEuro(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Summat */}
      <section className="mt-4 ml-auto max-w-sm rounded-xl border border-orange-200 bg-orange-50/60 p-4">
        <div className="flex justify-between text-sm text-stone-700">
          <span>Yhteensä ({vatLabel(quote.vat_included)})</span>
          <span className="tabular-nums font-medium">
            {formatEuro(vat.netEuros)}
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-stone-700">
          <span>ALV {vat.vatRate.toLocaleString("fi-FI")} %</span>
          <span className="tabular-nums font-medium">
            {formatEuro(vat.vatEuros)}
          </span>
        </div>
        <div className="mt-3 flex justify-between border-t border-orange-200/80 pt-3 text-base font-bold text-stone-950">
          <span>Tarjous yhteensä</span>
          <span className="tabular-nums">{formatEuro(vat.grossEuros)}</span>
        </div>
      </section>

      {quote.notes?.trim() && (
        <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Huomiot
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-stone-700">
            {quote.notes.trim()}
          </p>
        </section>
      )}

      {quote.terms?.trim() && (
        <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Ehdot
          </h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-stone-700">
            {quote.terms.trim()}
          </p>
        </section>
      )}

      {/* Kiitos + allekirjoitus */}
      <section className="mt-8 text-center">
        <p className="mx-auto max-w-xl text-sm italic leading-relaxed text-stone-600">
          {CONTRACTOR_QUOTE_THANK_YOU}
        </p>
        <p className="mt-5 text-sm text-stone-600">Ystävällisin terveisin</p>
        <p className="mt-1 text-sm font-semibold text-stone-900">{companyName}</p>
      </section>

      <footer className="mt-8 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
        <p>{contractorQuoteValidityNote(validityDays)}</p>
        <ContractorQuoteBrandMark />
      </footer>
    </article>
  );
}
