import { IlmalampopumppuDetailsView } from "@/components/project/ilmalampopumppu-details-view";
import {
  DetailSection,
  DetailSectionsGrid,
} from "@/components/project/project-detail-sections";
import { DeviceMaintenanceDetailsView } from "@/components/project/device-maintenance-details-view";
import { isDeviceMaintenanceDetails } from "@/lib/device-maintenance-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";
import {
  formatIvlpDetailsSummary,
  isIvlpDetails,
} from "@/lib/ilmavesilampopumppu-details";
import {
  formatMaalampDetailsSummary,
  isMaalampDetails,
} from "@/lib/maalampopumppu-details";

type ProjectDetails = {
  ilmalampopumppu?: unknown;
  ilmavesilampopumppu?: unknown;
  maalampopumppu?: unknown;
  laitteen_huolto?: unknown;
};

export function hasStructuredPumpDetails(
  details: ProjectDetails | null | undefined,
): boolean {
  if (!details) return false;
  return (
    isIlpDetails(details.ilmalampopumppu) ||
    isIvlpDetails(details.ilmavesilampopumppu) ||
    isMaalampDetails(details.maalampopumppu) ||
    isDeviceMaintenanceDetails(details.laitteen_huolto)
  );
}

export function ProjectPumpDetails({
  details,
}: {
  details: ProjectDetails | null | undefined;
}) {
  const maintenance = details?.laitteen_huolto;
  const ilp = details?.ilmalampopumppu;
  const ivlp = details?.ilmavesilampopumppu;
  const maalamp = details?.maalampopumppu;

  if (isDeviceMaintenanceDetails(maintenance)) {
    return <DeviceMaintenanceDetailsView details={maintenance} />;
  }

  if (isIlpDetails(ilp)) {
    return <IlmalampopumppuDetailsView details={ilp} />;
  }

  if (isMaalampDetails(maalamp)) {
    return (
      <LegacyPumpDetails
        title="Maalämpöpumpun tiedot"
        body={formatMaalampDetailsSummary(maalamp)}
      />
    );
  }

  if (isIvlpDetails(ivlp)) {
    return (
      <LegacyPumpDetails
        title="Vesi-ilmalämpöpumpun tiedot"
        body={formatIvlpDetailsSummary(ivlp)}
      />
    );
  }

  return null;
}

function LegacyPumpDetails({ title, body }: { title: string; body: string }) {
  return (
    <DetailSectionsGrid>
      <DetailSection
        title={title}
        rows={body
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const colon = line.indexOf(":");
            if (colon === -1) return { label: "—", value: line };
            return {
              label: line.slice(0, colon).trim(),
              value: line.slice(colon + 1).trim(),
            };
          })}
      />
    </DetailSectionsGrid>
  );
}
