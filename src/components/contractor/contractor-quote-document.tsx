import { ContractorQuoteBrandMark } from "@/components/contractor/contractor-quote-brand-mark";
import { formatEuro } from "@/lib/calculators/math";
import {
  CONTRACTOR_QUOTE_VALIDITY_NOTE,
  type ContractorQuoteDocumentView,
} from "@/lib/contractor-quote-print";
import {
  quoteVatBreakdown,
} from "@/lib/contractor-quote-types";
import { vatLabel } from "@/lib/vat-label";

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
  const dateStr = new Date(quote.created_at).toLocaleDateString("fi-FI");

  return (
    <article className="text-stone-900">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Tarjous
          </p>
          <h1 className="mt-1 text-2xl font-bold">{quote.title}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {companyName}
            {businessId ? ` · Y-tunnus ${businessId}` : ""}
          </p>
          {billingAddress && (
            <p className="text-sm text-stone-600">{billingAddress}</p>
          )}
          {companyDescription && (
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {companyDescription}
            </p>
          )}
        </div>
        {data.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logoUrl}
            alt=""
            className="h-12 max-w-[140px] object-contain object-left"
          />
        )}
      </header>

      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Asiakas ja kohde
        </h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {quote.client_name && (
            <div>
              <dt className="text-stone-500">Asiakas</dt>
              <dd className="font-medium">{quote.client_name}</dd>
            </div>
          )}
          {quote.client_email && (
            <div>
              <dt className="text-stone-500">Sähköposti</dt>
              <dd>{quote.client_email}</dd>
            </div>
          )}
          {quote.site_address && (
            <div>
              <dt className="text-stone-500">Kohde</dt>
              <dd>{quote.site_address}</dd>
            </div>
          )}
          {quote.site_municipality && (
            <div>
              <dt className="text-stone-500">Paikkakunta</dt>
              <dd>{quote.site_municipality}</dd>
            </div>
          )}
          <div>
            <dt className="text-stone-500">Tarjouspäivä</dt>
            <dd>{dateStr}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Työn sisältö ja hinnat
        </h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-stone-100">
                <td className="py-2 pr-4">{line.label}</td>
                <td className="py-2 text-right tabular-nums font-medium">
                  {formatEuro(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {quote.notes?.trim() && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Huomiot
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
            {quote.notes.trim()}
          </p>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 print:border-stone-300">
        <div className="flex justify-between text-sm">
          <span>Yhteensä ({vatLabel(quote.vat_included)})</span>
          <span className="tabular-nums font-medium">
            {formatEuro(vat.netEuros)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span>ALV {vat.vatRate.toLocaleString("fi-FI")} %</span>
          <span className="tabular-nums font-medium">
            {formatEuro(vat.vatEuros)}
          </span>
        </div>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-base font-bold">
          <span>Loppusumma</span>
          <span className="tabular-nums">{formatEuro(vat.grossEuros)}</span>
        </div>
      </section>

      <footer className="mt-8 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
        <p>{CONTRACTOR_QUOTE_VALIDITY_NOTE}</p>
        <ContractorQuoteBrandMark />
      </footer>
    </article>
  );
}
