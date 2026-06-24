/** Laitteet & integraatiot — reitit */
import { parseZwaveDeviceId } from "@/lib/device-protocol";

export const LAITTEET = {
  root: "/laitteet",
  luettelo: "/laitteet/luettelo",
  zigbee: "/laitteet/zigbee",
  zwave: "/laitteet/zwave",
  zigbeeDevice: (name: string) => `/laitteet/zigbee/${encodeURIComponent(name.replace(/^zigbee:/, ""))}`,
  zwaveDevice: (nodeId: string | number) => {
    const raw = String(nodeId).trim();
    const parsed = parseZwaveDeviceId(raw.includes(":") ? raw : `zwave:${raw}`);
    const key = parsed ? String(parsed.nodeId) : raw.replace(/^zwave:/, "").split(":")[0]!;
    return `/laitteet/zwave/${encodeURIComponent(key)}`;
  },
  valot: "/valot",
  keskusyksikko: "/laitteet/keskusyksikko",
  shelly: "/laitteet/shelly",
  energia: "/energia",
  tasmota: "/laitteet/tasmota",
  airthings: "/laitteet/airthings",
  automaatio: "/laitteet/automaatio",
  pohjakuva: "/laitteet/pohjakuva",
} as const;
