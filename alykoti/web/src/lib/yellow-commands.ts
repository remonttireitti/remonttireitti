import { fetchYellowApi } from "@/lib/yellow-api";

export async function sendYellowCommand(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<{ ok: boolean; error?: string }> {
  const { status, data } = await fetchYellowApi<{ ok?: boolean; error?: string }>(
    "/api/device/commands",
    { method: "POST", body: { command, payload } },
  );
  if (status !== 200 || !data?.ok) {
    return { ok: false, error: data?.error ?? "Paikallinen komento epäonnistui." };
  }
  return { ok: true };
}
