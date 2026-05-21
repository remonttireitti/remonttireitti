"use client";

import {
  DetailItem,
  DetailSection,
  DetailSectionsGrid,
  type DetailRow,
} from "@/components/project/project-detail-sections";
import { getIlpDetailSections } from "@/lib/ilp-detail-sections";
import { ilpDescriptionIsRedundant } from "@/lib/ilp-detail-sections";
import { formatIvlpDetailsSummary } from "@/lib/ilmavesilampopumppu-details";
import { formatMaalampDetailsSummary } from "@/lib/maalampopumppu-details";
import { EQUIPMENT_SUPPLY_LABELS } from "@/lib/equipment-supply";
import type { IlmalampopumppuDetails } from "@/types/ilmalampopumppu-details";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";

function linesToRows(body: string): DetailRow[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return { label: "—", value: line };
      return {
        label: line.slice(0, colon).trim(),
        value: line.slice(colon + 1).trim(),
      };
    });
}

function SummaryAccordion({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 marker:content-none hover:bg-stone-50/80">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-stone-900">
            {title}
          </span>
          {hint && (
            <span className="mt-0.5 block text-xs font-normal text-stone-500">
              {hint}
            </span>
          )}
        </span>
        <svg
          className="size-5 shrink-0 text-stone-400 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="border-t border-stone-100 px-4 py-4">{children}</div>
    </details>
  );
}

export function ProjectSummaryReview({
  jobTypeName,
  title,
  description,
  isIlp,
  ilpDetails,
  isIvlp,
  ivlpDetails,
  isMaalamp,
  maalampDetails,
  hasStructuredForm,
  contactEmail,
  contactPhone,
  addressLine,
  postalCode,
  municipality,
  budgetMaxLabel,
  photoCount = 0,
}: {
  jobTypeName: string;
  title: string;
  description: string;
  isIlp: boolean;
  ilpDetails: IlmalampopumppuDetails;
  isIvlp: boolean;
  ivlpDetails: IlmavesilampopumppuDetails;
  isMaalamp: boolean;
  maalampDetails: MaalampopumppuDetails;
  hasStructuredForm: boolean;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  postalCode: string;
  municipality: string;
  budgetMaxLabel?: string | null;
  photoCount?: number;
}) {
  const scopeLabel = hasStructuredForm
    ? EQUIPMENT_SUPPLY_LABELS[
        isIlp
          ? ilpDetails.equipment_supply
          : isIvlp
            ? ivlpDetails.equipment_supply
            : maalampDetails.equipment_supply
      ] +
      (isIlp &&
      ilpDetails.equipment_supply === "installation_only" &&
      ilpDetails.allow_optional_equipment_offer
        ? " — laitetarjoukset sallittu"
        : "")
    : null;

  const showFreeTextDescription =
    !hasStructuredForm ||
    (isIlp && !ilpDescriptionIsRedundant(description, ilpDetails));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Haluatko varmistaa tarjouspyynnön tiedot?
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Tarkista valinnat ennen julkaisua. Avaa osiot nuolesta — urakoitsijat
          näkevät saman sisällön strukturoituna tarjouspyynnössä.
        </p>
      </div>

      <SummaryAccordion title="Yleiskatsaus" defaultOpen>
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Lämpöpumppu" value={jobTypeName} />
          <DetailItem label="Otsikko" value={title} />
          {scopeLabel && <DetailItem label="Tarjouksen laajuus" value={scopeLabel} />}
          {budgetMaxLabel && (
            <DetailItem label="Budjetin yläraja" value={budgetMaxLabel} />
          )}
          {photoCount > 0 && (
            <DetailItem
              label="Kuvat"
              value={`${photoCount} kpl liitetty pyyntöön`}
            />
          )}
        </dl>
      </SummaryAccordion>

      {isIlp && (
        <SummaryAccordion
          title="Kohde, asennus ja budjetti"
          hint="Kaikki lomakkeella valitsemasi tiedot"
        >
          <DetailSectionsGrid>
            {getIlpDetailSections(ilpDetails).map((section) => (
              <DetailSection
                key={section.title}
                title={section.title}
                rows={section.rows}
              />
            ))}
          </DetailSectionsGrid>
        </SummaryAccordion>
      )}

      {isIvlp && (
        <SummaryAccordion title="Kohde ja järjestelmä" hint="Vesi-ilmalämpöpumppu">
          <DetailSection
            title="Tiedot"
            rows={linesToRows(formatIvlpDetailsSummary(ivlpDetails))}
          />
        </SummaryAccordion>
      )}

      {isMaalamp && (
        <SummaryAccordion title="Kohde ja järjestelmä" hint="Maalämpöpumppu">
          <DetailSection
            title="Tiedot"
            rows={linesToRows(formatMaalampDetailsSummary(maalampDetails))}
          />
        </SummaryAccordion>
      )}

      {showFreeTextDescription && description.trim().length > 0 && (
        <SummaryAccordion title="Vapaa kuvaus">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {description.trim()}
          </p>
        </SummaryAccordion>
      )}

      <SummaryAccordion title="Yhteystiedot ja sijainti">
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Sähköposti" value={contactEmail} />
          <DetailItem label="Puhelin" value={contactPhone} />
          <DetailItem
            label="Urakan osoite"
            value={`${addressLine}, ${postalCode} ${municipality}`}
          />
        </dl>
      </SummaryAccordion>
    </div>
  );
}
