import Link from "next/link";
import {
  BID_CONVERSION_BUILDING_NOTE,
  BID_CONVERSION_DISCLAIMER,
  formatBidConversionLabel,
  type ContractorMarketSignals,
} from "@/lib/contractor-market-profile";
import {
  RESPONSE_TIME_BUILDING_NOTE,
  type ContractorResponseTimeDisplay,
} from "@/lib/contractor-response-time";

function ResponseTimeSelfRow({
  responseTime,
}: {
  responseTime: ContractorResponseTimeDisplay;
}) {
  if (responseTime.kind === "none") {
    return (
      <p className="text-sm text-stone-600">
        Vastausaika näkyy, kun olet lähettänyt tarpeeksi tarjouksia
        Remonttireitin kautta.
      </p>
    );
  }
  if (responseTime.kind === "building") {
    return (
      <p className="text-sm text-stone-600">
        {RESPONSE_TIME_BUILDING_NOTE(
          responseTime.sampleCount,
          responseTime.required,
        )}
      </p>
    );
  }
  return (
    <p className="text-sm text-stone-800">
      <span aria-hidden="true">⚡ </span>
      {responseTime.detailLabel}
      <span className="mt-1 block text-xs text-stone-500">
        Asiakkaat näkevät: {responseTime.customerLabel}
      </span>
    </p>
  );
}

export function ContractorMarketProfilePanel({
  signals,
  publicProfileHref,
}: {
  signals: ContractorMarketSignals;
  publicProfileHref: string;
}) {
  const hasPublicSignals =
    signals.conversion.kind === "shown" || signals.responseTime.kind === "shown";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Profiilisi asiakkaalle
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Neutraalit tilastot auttavat asiakkaita vertailemaan tarjouksia.
            Remonttireitti ei julista parasta yritystä.
          </p>
        </div>
        <Link
          href={publicProfileHref}
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          Julkinen profiili →
        </Link>
      </div>

      <dl className="mt-4 space-y-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Tilausprosentti
          </dt>
          <dd className="mt-1">
            {signals.conversion.kind === "shown" ? (
              <p className="text-sm text-stone-800">
                {formatBidConversionLabel(signals.conversion.percent)}
              </p>
            ) : signals.conversion.kind === "building" ? (
              <p className="text-sm text-stone-600">
                {BID_CONVERSION_BUILDING_NOTE(
                  signals.conversion.sampleCount,
                  signals.conversion.required,
                )}
              </p>
            ) : (
              <p className="text-sm text-stone-600">
                Lähetä tarjouksia Remonttireitin kautta — tilausprosentti
                muodostuu automaattisesti.
              </p>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Vastausaika
          </dt>
          <dd className="mt-1">
            <ResponseTimeSelfRow responseTime={signals.responseTime} />
          </dd>
        </div>
      </dl>

      {hasPublicSignals && (
        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          {BID_CONVERSION_DISCLAIMER}
        </p>
      )}
    </section>
  );
}
