export type LightControlPayload = {
  id: string;
  on?: boolean;
  brightness?: number;
  color?: { hue?: number; saturation?: number; color_temp?: number };
  mqtt_set_topic?: string | null;
  lock_set_topic?: string | null;
};

export type LightControlResponse = {
  ok?: boolean;
  error?: string;
  commandId?: string;
  mirrorCommandIds?: string[];
};

export async function sendLightControl(
  payload: LightControlPayload,
): Promise<LightControlResponse> {
  const res = await fetch("/api/lights/control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as LightControlResponse;
}

export function lightControlCommandIds(json: LightControlResponse): string[] {
  const ids: string[] = [];
  if (json.commandId) ids.push(json.commandId);
  for (const id of json.mirrorCommandIds ?? []) {
    if (id) ids.push(id);
  }
  return ids;
}
