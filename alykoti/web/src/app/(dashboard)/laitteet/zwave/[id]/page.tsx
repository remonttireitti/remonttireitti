import { DeviceDetailPanel } from "@/components/device-detail-panel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ZwaveDevicePage({ params }: Props) {
  const { id } = await params;
  return <DeviceDetailPanel protocol="zwave" deviceIdParam={id} />;
}
