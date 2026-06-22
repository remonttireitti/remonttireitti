import mqtt, { type MqttClient } from "mqtt";

export type LightDevice = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
};

type Z2MExpose = {
  type?: string;
  name?: string;
  features?: Z2MExpose[];
};

type Z2MDevice = {
  friendly_name: string;
  definition?: { exposes?: Z2MExpose[] };
  supported?: boolean;
};

function mqttBrokerUrl(): string | null {
  return process.env.ZIGBEE2MQTT_MQTT_URL?.trim() || null;
}

function isLightDevice(device: Z2MDevice): boolean {
  const exposes = device.definition?.exposes ?? [];
  function scan(items: Z2MExpose[]): boolean {
    for (const item of items) {
      if (item.type === "light") return true;
      if (item.name === "state" && item.type === "binary") return true;
      if (item.features && scan(item.features)) return true;
    }
    return false;
  }
  return scan(exposes);
}

function withMqtt<T>(run: (client: MqttClient) => Promise<T>): Promise<T> {
  const url = mqttBrokerUrl();
  if (!url) {
    return Promise.reject(new Error("ZIGBEE2MQTT_MQTT_URL not configured"));
  }

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      connectTimeout: 4_000,
      reconnectPeriod: 0,
    });

    const fail = (error: Error) => {
      client.end(true);
      reject(error);
    };

    client.on("error", fail);

    client.once("connect", () => {
      run(client)
        .then((value) => {
          client.end(true);
          resolve(value);
        })
        .catch(fail);
    });
  });
}

export function isZigbeeConfigured(): boolean {
  return mqttBrokerUrl() != null;
}

function topicPrefix(): string {
  return process.env.ZIGBEE2MQTT_TOPIC_PREFIX?.trim() || "zigbee2mqtt";
}

export async function fetchLights(): Promise<LightDevice[]> {
  const prefix = topicPrefix();
  return withMqtt(async (client) => {
    const lights = new Map<string, LightDevice>();
    let listDone = false;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (listDone) resolve();
        else reject(new Error("Zigbee2MQTT timeout — onko Yellow (192.168.50.108) verkossa?"));
      }, 6_000);

      client.subscribe([`${prefix}/bridge/devices`, `${prefix}/#`]);

      client.on("message", (topic, payload) => {
        const raw = payload.toString();

        if (topic === `${prefix}/bridge/devices`) {
          try {
            const list = JSON.parse(raw) as Z2MDevice[];
            for (const device of list) {
              if (!device.friendly_name || !isLightDevice(device)) continue;
              lights.set(device.friendly_name, {
                id: device.friendly_name,
                name: device.friendly_name,
                on: false,
                brightness: null,
                reachable: true,
                roomAnchorId: null,
              });
            }
          } catch {
            /* ignore malformed */
          }
          listDone = true;
          setTimeout(() => {
            clearTimeout(timeout);
            resolve();
          }, 800);
          return;
        }

        const head = `${prefix}/`;
        if (!topic.startsWith(head) || topic.startsWith(`${prefix}/bridge`)) {
          return;
        }
        const id = topic.slice(head.length);
        if (!id || !lights.has(id)) return;

        try {
          const state = JSON.parse(raw) as {
            state?: string;
            brightness?: number;
          };
          const current = lights.get(id)!;
          if (state.state != null) current.on = state.state === "ON";
          if (state.brightness != null) current.brightness = state.brightness;
        } catch {
          /* ignore */
        }
      });
    });

    return [...lights.values()];
  });
}

export async function setLightState(
  id: string,
  on: boolean,
  brightness?: number,
): Promise<void> {
  await withMqtt(async (client) => {
    const prefix = topicPrefix();
    await new Promise<void>((resolve, reject) => {
      const payload: Record<string, string | number> = { state: on ? "ON" : "OFF" };
      if (brightness != null) payload.brightness = brightness;

      client.publish(`${prefix}/${id}/set`, JSON.stringify(payload), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export async function setLightColor(
  id: string,
  opts: {
    on: boolean;
    brightness?: number;
    hue?: number;
    saturation?: number;
    color_temp?: number;
  },
): Promise<void> {
  await withMqtt(async (client) => {
    const prefix = topicPrefix();
    await new Promise<void>((resolve, reject) => {
      const payload: Record<string, string | number> = {
        state: opts.on ? "ON" : "OFF",
      };
      if (opts.brightness != null) payload.brightness = opts.brightness;
      if (opts.color_temp != null) payload.color_temp = opts.color_temp;
      if (opts.hue != null) {
        payload.hue = opts.hue;
        payload.saturation = opts.saturation ?? 254;
      }

      client.publish(`${prefix}/${id}/set`, JSON.stringify(payload), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
