import type { ReactNode } from "react";
import { CeilingCassetteDiagram } from "@/components/reports/ceiling-cassette-diagram";
import {
  CONVECTOR_CHECK_LEGEND,
  formatFiNumber,
  type ConvectorChecks,
  type ConvectorUnit,
  type ExampleConvectorReport,
  type InspectionCheck,
} from "@/lib/example-convector-report";

const CHECK_MARK: Record<InspectionCheck, string> = {
  ok: "✓",
  fail: "✗",
  na: "–",
};

function checkClass(value: InspectionCheck): string {
  if (value === "ok") return "text-emerald-700";
  if (value === "fail") return "text-red-600";
  return "text-stone-400";
}

function InfoRow({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-stone-400/80 py-1 text-[11px] leading-snug text-stone-800 sm:text-xs">
      {children}
    </p>
  );
}

function TempChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "supply" | "return" | "room";
}) {
  const colors =
    tone === "supply"
      ? "border-sky-300 bg-sky-50 text-sky-900"
      : tone === "return"
        ? "border-orange-300 bg-orange-50 text-orange-950"
        : "border-emerald-300 bg-emerald-50 text-emerald-950";
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${colors}`}
    >
      <span>{label}</span>
      <span>{formatFiNumber(value, 1)} °C</span>
    </span>
  );
}

function ChecksRow({ checks }: { checks: ConvectorChecks }) {
  return (
    <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium leading-tight sm:text-[11px]">
      {CONVECTOR_CHECK_LEGEND.map((item) => {
        const value = checks[item.key];
        return (
          <span key={item.key} className="text-stone-600">
            {item.label}{" "}
            <span className={checkClass(value)}>{CHECK_MARK[value]}</span>
          </span>
        );
      })}
    </p>
  );
}

function ConvectorCard({ unit }: { unit: ConvectorUnit }) {
  const border = unit.hasFault
    ? "border-red-300 bg-red-50/40"
    : "border-emerald-300 bg-emerald-50/30";
  const specs = [
    `Neste: ${unit.fluid}`,
    unit.airFlowM3h != null ? `Ilmavirtaus: ${unit.airFlowM3h} m³/h` : null,
    unit.airPowerKw != null
      ? `Ilma: näyttöhyöty (ΔT × virtaus) ${formatFiNumber(unit.airPowerKw)} kW`
      : null,
    unit.waterFlowLs != null
      ? `Arvioitu vesivirtaus ${formatFiNumber(unit.waterFlowLs, 3)} l/s`
      : null,
  ].filter(Boolean);

  return (
    <article
      className={`break-inside-avoid rounded-md border p-2 shadow-sm ${border}`}
    >
      <h3 className="text-[11px] font-bold leading-tight text-stone-900 sm:text-xs">
        {unit.index}. {unit.title}
      </h3>
      <p className="mt-0.5 text-[10px] leading-snug text-stone-600">
        {unit.code} · {unit.model} · {unit.serial ?? "————"}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-stone-500">{specs.join(" · ")}</p>

      {unit.showDiagram ? (
        <div className="relative mt-1.5">
          {unit.roomC != null && (
            <div className="absolute right-1 top-1 z-10">
              <TempChip label="Huone" value={unit.roomC} tone="room" />
            </div>
          )}
          {unit.supplyC != null && (
            <div className="absolute left-0 top-[28%] z-10">
              <TempChip label="Tulo" value={unit.supplyC} tone="supply" />
            </div>
          )}
          {unit.returnC != null && (
            <div className="absolute left-0 top-[52%] z-10">
              <TempChip label="Meno" value={unit.returnC} tone="return" />
            </div>
          )}
          <CeilingCassetteDiagram className="h-auto w-full" />
        </div>
      ) : null}

      <div className="mt-1.5">
        <ChecksRow checks={unit.checks} />
        <p className="mt-1 min-h-[1.25rem] text-[10px] leading-snug text-stone-700">
          {unit.note ?? "—"}
        </p>
      </div>
    </article>
  );
}

export function HuoltopoytakirjaDocument({
  report,
}: {
  report: ExampleConvectorReport;
}) {
  return (
    <article className="huoltopoytakirja mx-auto max-w-[210mm] bg-white text-stone-900 print:max-w-none">
      <header className="relative pb-6 text-center print:break-after-page">
        <p className="absolute right-0 top-0 text-xs text-stone-500 print:text-[11px]">
          {report.dateLabel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {report.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
          {report.subtitle}
        </p>
        <p className="mt-2 text-xs italic text-stone-400">
          Esimerkkiraportti — tiedot ovat keksittyjä.
        </p>

        <div
          className="mt-8 border-t-4 border-dashed border-orange-500"
          aria-hidden
        />

        <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
          <section className="rounded-md border border-stone-400 px-3 py-2">
            <h2 className="border-b border-stone-400 pb-1 text-xs font-bold uppercase tracking-wide text-stone-600">
              Yritystiedot
            </h2>
            <InfoRow>: {report.company.name}</InfoRow>
            <InfoRow>Y-tunnus: {report.company.businessId}</InfoRow>
            <InfoRow>: {report.company.address}</InfoRow>
            <InfoRow>Puh: {report.company.phone}</InfoRow>
            <InfoRow>: {report.company.email}</InfoRow>
          </section>
          <section className="rounded-md border-2 border-sky-500 px-3 py-2">
            <h2 className="border-b border-sky-500 pb-1 text-xs font-bold uppercase tracking-wide text-sky-700">
              Asiakastiedot
            </h2>
            <InfoRow>: {report.customer.name}</InfoRow>
            <InfoRow>: {report.customer.address}</InfoRow>
          </section>
        </div>

        <div className="mt-5 space-y-1 text-left text-sm font-semibold">
          {report.maintenanceDone && (
            <p className="text-emerald-700">Kyllä ✓ Huolto suoritettu</p>
          )}
          {report.faultFound && (
            <p className="text-red-600">Laitteessa vika havaittu</p>
          )}
        </div>
        <p className="mt-4 text-left text-sm text-stone-700">
          Tekijä: {report.performer} · Päivämäärä: {report.dateLabel}
        </p>
      </header>

      <section className="mt-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-sky-800">
          Konvektorit
        </h2>
        <div className="mt-2 overflow-hidden rounded-md border border-sky-200">
          <div className="grid grid-cols-3 divide-x divide-sky-100 bg-sky-50/80 text-[11px]">
            <div className="px-3 py-2">
              <p className="text-stone-500">Konvektoreita</p>
              <p className="font-semibold text-stone-900">{report.units.length}</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-stone-500">Kuvaus</p>
              <p className="font-semibold text-stone-900">{report.site.description}</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-stone-500">Alue</p>
              <p className="font-semibold text-stone-900">{report.site.area}</p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-stone-600">
          Yksittäisten konvektorien tiedot alla. Lyhenteet viittaavat
          tarkastuskohteisiin.
        </p>
        <p className="mt-1 text-[11px] font-medium text-stone-700">
          Tarkastuskohdat (✓ = OK, ✗ = ei OK, – = ei vastattu)
        </p>
        <ul className="mt-1 space-y-0.5 text-[11px] text-stone-600">
          {CONVECTOR_CHECK_LEGEND.map((item) => (
            <li key={item.key}>
              <span className="font-semibold text-stone-800">{item.label}</span>
              {" — "}
              {item.detail}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-stone-500">
          Ruudun tausta: vihreä = kaikki OK · punertava = vika tai jokin kohta Ei.
          Kuvan päällä: Huone = imuilma, vasemmalla pino = tulo/virtaus/meno.
          Neste, virtaus ja laskettu teho otsikkorivillä.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 print:grid-cols-4 lg:grid-cols-4">
          {report.units.map((unit) => (
            <ConvectorCard key={unit.code} unit={unit} />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border-2 border-violet-400 px-4 py-3 print:break-inside-avoid">
        <h2 className="text-sm font-bold uppercase tracking-wide text-violet-800">
          Huomiot ja lisätiedot
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-800">{report.notes}</p>
      </section>

      <footer className="mt-8 flex flex-col gap-2 border-t border-stone-200 pt-3 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Suorittaja: {report.performer}{" "}
          <span className="text-stone-500">| TUKES: {report.tukes}</span>
        </p>
        <p>Päivämäärä: {report.dateLabel}</p>
      </footer>
    </article>
  );
}
