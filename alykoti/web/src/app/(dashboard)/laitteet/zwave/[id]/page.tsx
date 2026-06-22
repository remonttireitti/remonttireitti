import { ZwaveDeviceDetailPanel } from "@/components/zwave-device-detail-panel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ZwaveDevicePage({ params }: Props) {
  const { id } = await params;
  return <ZwaveDeviceDetailPanel deviceIdParam={id} />;
}
