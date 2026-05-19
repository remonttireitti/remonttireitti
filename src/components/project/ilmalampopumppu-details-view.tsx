import {
  DetailSection,
  DetailSectionsGrid,
} from "@/components/project/project-detail-sections";
import { getIlpDetailSections } from "@/lib/ilp-detail-sections";
import type { IlmalampopumppuDetails } from "@/types/ilmalampopumppu-details";

export function IlmalampopumppuDetailsView({
  details,
}: {
  details: IlmalampopumppuDetails;
}) {
  const sections = getIlpDetailSections(details);

  return (
    <DetailSectionsGrid>
      {sections.map((section) => (
        <DetailSection
          key={section.title}
          title={section.title}
          rows={section.rows}
        />
      ))}
    </DetailSectionsGrid>
  );
}
