/** Yellow → synkki → web: automaation suoritusloki. */

export type AutomationEventStage =
  | "mqtt"
  | "triggered"
  | "command_sent"
  | "ok"
  | "failed"
  | "no_match";

export type AutomationEvent = {
  at: string;
  stage: AutomationEventStage;
  rule_id?: string | null;
  rule_name?: string | null;
  device_id?: string | null;
  mqtt_action?: string | null;
  mqtt_button?: string | null;
  target_id?: string | null;
  action_type?: string | null;
  message?: string | null;
};

export const AUTOMATION_STAGE_LABELS: Record<AutomationEventStage, string> = {
  mqtt: "MQTT vastaanotettu",
  triggered: "Sääntö laukesi",
  command_sent: "Komento lähetetty",
  ok: "Onnistui",
  failed: "Epäonnistui",
  no_match: "Ei täsmännyt",
};

export function normalizeAutomationEvents(raw: unknown): AutomationEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: AutomationEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const stage = e.stage;
    if (
      stage !== "mqtt" &&
      stage !== "triggered" &&
      stage !== "command_sent" &&
      stage !== "ok" &&
      stage !== "failed" &&
      stage !== "no_match"
    ) {
      continue;
    }
    out.push({
      at: typeof e.at === "string" ? e.at : new Date().toISOString(),
      stage,
      rule_id: typeof e.rule_id === "string" ? e.rule_id : null,
      rule_name: typeof e.rule_name === "string" ? e.rule_name : null,
      device_id: typeof e.device_id === "string" ? e.device_id : null,
      mqtt_action: typeof e.mqtt_action === "string" ? e.mqtt_action : null,
      mqtt_button: typeof e.mqtt_button === "string" ? e.mqtt_button : null,
      target_id: typeof e.target_id === "string" ? e.target_id : null,
      action_type: typeof e.action_type === "string" ? e.action_type : null,
      message: typeof e.message === "string" ? e.message : null,
    });
  }
  return out.slice(0, 60);
}

export function formatAutomationEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
