import { DeviceManagementPanel } from "@/components/device-management-panel";

export default function ZigbeeDevicesPage() {
  return (
    <DeviceManagementPanel
      protocol="zigbee"
      title="Zigbee (SkyConnect)"
      description="Lamput, kytkimet ja anturit Zigbee2MQTT:n kautta."
    />
  );
}
