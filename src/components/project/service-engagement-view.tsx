import {
  DetailItem,
  DetailSection,
} from "@/components/project/project-detail-sections";
import {
  formatServiceEngagementSummary,
  type ServiceEngagement,
} from "@/lib/service-engagement";

export function ServiceEngagementView({
  engagement,
}: {
  engagement: ServiceEngagement;
}) {
  const rows = formatServiceEngagementSummary(engagement);

  return (
    <DetailSection title="Palvelun toistuvuus">
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <DetailItem key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </DetailSection>
  );
}
