import { DeviceManagementPanel } from "@/components/device-management-panel";

export default function ZwaveDevicesPage() {
  return (
    <DeviceManagementPanel
      protocol="zwave"
      title="Z-Wave (Z-Pi 7)"
      description="Valot, releet, lukot ja anturit Z-Wave JS UI:n kautta."
    />
  );
}
