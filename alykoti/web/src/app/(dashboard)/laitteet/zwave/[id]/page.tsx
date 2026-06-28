import { notFound } from "next/navigation";
import { ZwaveDeviceDetailPanel } from "@/components/zwave-device-detail-panel";
import { fetchPrimaryHub } from "@/lib/hubs";
import { loadZwaveDeviceDetail } from "@/lib/zwave-device-detail-load";
import { getSessionSupabase, getSessionUser } from "@/lib/local-session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ZwaveDevicePage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  const supabase = await getSessionSupabase();

  const hub = await fetchPrimaryHub(supabase, user.id);
  const initial = hub ? loadZwaveDeviceDetail(hub, id) : null;
  if (!initial) notFound();

  return <ZwaveDeviceDetailPanel deviceIdParam={id} initial={initial} />;
}
