import { DeviceManagementPanel } from "@/components/device-management-panel";

export default function LaitteetLuetteloPage() {
  return (
    <DeviceManagementPanel
      title="Kaikki laitteet"
      description="Yellow synkkaa laitteet ~30 s välein. Alla ryhmittely laitetyypin mukaan (valot, lukot, anturit…)."
      groupByRole
    />
  );
}
