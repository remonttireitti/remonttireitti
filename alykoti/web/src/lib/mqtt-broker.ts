/** MQTT-brokerin asetukset (Zigbee2MQTT + Z-Wave JS UI). */

export function zigbeeMqttUrl(): string | null {
  return process.env.ZIGBEE2MQTT_MQTT_URL?.trim() || process.env.MQTT_URL?.trim() || null;
}

export function zigbeeTopicPrefix(): string {
  return process.env.ZIGBEE2MQTT_TOPIC_PREFIX?.trim() || process.env.SKYCONNECT_TOPIC_PREFIX?.trim() || "zigbee2mqtt";
}

export function zwaveTopicPrefix(): string {
  return process.env.ZWAVE_TOPIC_PREFIX?.trim() || "zwave";
}

export function isMqttConfigured(): boolean {
  return zigbeeMqttUrl() != null;
}

export function parseMqttHostPort(url: string): { host: string; port: number } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number.parseInt(parsed.port, 10) : 1883,
    };
  } catch {
    return { host: "127.0.0.1", port: 1883 };
  }
}
