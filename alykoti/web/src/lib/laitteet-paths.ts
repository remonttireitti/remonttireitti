/** Laitteet & integraatiot — reitit */
export const LAITTEET = {
  root: "/laitteet",
  luettelo: "/laitteet/luettelo",
  zigbee: "/laitteet/zigbee",
  zwave: "/laitteet/zwave",
  zigbeeDevice: (name: string) => `/laitteet/zigbee/${encodeURIComponent(name.replace(/^zigbee:/, ""))}`,
  zwaveDevice: (nodeId: string | number) =>
    `/laitteet/zwave/${encodeURIComponent(String(nodeId).replace(/^zwave:/, ""))}`,
  valot: "/laitteet/valot",
  keskusyksikko: "/laitteet/keskusyksikko",
  shelly: "/laitteet/shelly",
  energia: "/laitteet/energia",
  tasmota: "/laitteet/tasmota",
  airthings: "/laitteet/airthings",
  automaatio: "/laitteet/automaatio",
} as const;
