import {
  DetailSection,
  DetailSectionsGrid,
} from "@/components/project/project-detail-sections";
import { ProjectPhotosGallery } from "@/components/project/project-photos-gallery";
import {
  hasStructuredPumpDetails,
  ProjectPumpDetails,
} from "@/components/project/project-pump-details";
import { ServiceEngagementView } from "@/components/project/service-engagement-view";
import { ilpDescriptionIsRedundant } from "@/lib/ilp-detail-sections";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";
import { serviceEngagementFromDetails } from "@/lib/service-engagement";
import { formatBudget } from "@/lib/projects";
import type { ProjectPhotoView } from "@/lib/project-photos";

type ProjectDetailsJson = {
  ilmalampopumppu?: unknown;
  ilmavesilampopumppu?: unknown;
  maalampopumppu?: unknown;
};

type Props = {
  title?: string;
  description: string;
  details: ProjectDetailsJson | null;
  photos: ProjectPhotoView[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLine?: string | null;
  postalCode: string;
  municipality: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  desiredStart?: string | null;
  completionNotes?: string | null;
  /** Näytä yhteystiedot (asiakkaan sivu); urakoitsijalla ennen maksua piilotettu */
  showContact?: boolean;
  /** Kun yhteystiedot piilotettu, näytä vain kunta/postinumero */
  showLocationOnly?: boolean;
  bidDeadline?: string | null;
  /** invite = urakoitsija ei ole vielä tarjonnut; info = jo tarjonnut; customer = asiakkaan näkymä */
  bidDeadlineVariant?: "invite" | "info" | "customer";
  contactHiddenHint?: string;
};

export function ProjectOverviewCards({
  description,
  details,
  photos,
  contactEmail,
  contactPhone,
  addressLine,
  postalCode,
  municipality,
  budgetMin,
  budgetMax,
  desiredStart,
  completionNotes,
  showContact = true,
  showLocationOnly = false,
  bidDeadline,
  bidDeadlineVariant = "invite",
  contactHiddenHint,
}: Props) {
  const structured = hasStructuredPumpDetails(details);
  const serviceEngagement = serviceEngagementFromDetails(details);
  const ilp = details?.ilmalampopumppu;
  const hideDescription =
    structured &&
    (isIlpDetails(ilp)
      ? ilpDescriptionIsRedundant(description, ilp)
      : true);

  const address = addressLine
    ? `${addressLine}, ${postalCode} ${municipality}`
    : `${postalCode} ${municipality}`;

  return (
    <div className="space-y-3">
      <ProjectPumpDetails details={details} />
      {serviceEngagement && (
        <ServiceEngagementView engagement={serviceEngagement} />
      )}

      {photos.length > 0 && <ProjectPhotosGallery photos={photos} />}

      {!hideDescription && description.trim() && (
        <DetailSection
          title="Kuvaus"
          rows={[{ label: "Teksti", value: description.trim() }]}
        />
      )}

      {showContact && (
        <DetailSection
          title="Yhteystiedot ja sijainti"
          rows={[
            ...(contactEmail
              ? [{ label: "Sähköposti", value: contactEmail }]
              : []),
            ...(contactPhone ? [{ label: "Puhelin", value: contactPhone }] : []),
            { label: "Urakan osoite", value: address },
          ]}
        />
      )}

      {!showContact && showLocationOnly && (
        <DetailSection
          title="Sijainti"
          rows={[
            {
              label: "Alue",
              value: `${municipality}, ${postalCode}`,
            },
          ]}
        />
      )}

      {bidDeadline && (
        <DetailSection
          title="Tarjousaika"
          rows={[
            {
              label:
                bidDeadlineVariant === "invite"
                  ? "Tarjoa viimeistään"
                  : "Tarjousaika päättyy",
              value: new Date(bidDeadline).toLocaleDateString("fi-FI"),
            },
          ]}
        />
      )}

      {bidDeadline && bidDeadlineVariant === "info" && (
        <p className="rounded-lg bg-stone-50 px-4 py-2 text-xs leading-relaxed text-stone-600">
          Olet jo jättänyt tarjouksen. Voit päivittää sitä, kunnes asiakas hyväksyy
          jonkin tarjouksen. Muut urakoitsijat voivat tarjota vielä tähän päivään
          asti.
        </p>
      )}

      {bidDeadline && bidDeadlineVariant === "customer" && (
        <p className="rounded-lg bg-sky-50 px-4 py-2 text-xs leading-relaxed text-sky-900">
          Voit valita tarjouksen tai sulkea pyynnön myös ennen tätä päivää.
        </p>
      )}

      {contactHiddenHint && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {contactHiddenHint}
        </p>
      )}

      {!structured && (budgetMin != null || budgetMax != null || desiredStart) && (
        <DetailSectionsGrid>
          <DetailSection
            title="Budjetti ja aikataulu"
            rows={[
              {
                label: "Budjetti",
                value: formatBudget(budgetMin ?? null, budgetMax ?? null),
              },
              ...(desiredStart
                ? [{ label: "Toivottu aloitus", value: desiredStart }]
                : []),
            ]}
          />
        </DetailSectionsGrid>
      )}

      {completionNotes && (
        <DetailSection
          title="Valmistuminen"
          rows={[{ label: "Kommentti", value: completionNotes }]}
        />
      )}
    </div>
  );
}
