export type HubControlMode = "auto" | "manual" | "fireplace" | "hood";

export type VentilationConfig = {
  co2_normal_max: number;
  co2_elevated_max: number;
  co2_high_max: number;
  speed_normal_pct: number;
  speed_elevated_pct: number;
  speed_high_pct: number;
  speed_max_pct: number;
  night_enabled: boolean;
  night_start_hour: number;
  night_end_hour: number;
  night_max_pct: number;
  fireplace_supply_pct: number;
  fireplace_exhaust_pct: number;
  hood_supply_pct: number;
  hood_exhaust_pct: number;
};

export const DEFAULT_VENTILATION_CONFIG: VentilationConfig = {
  co2_normal_max: 800,
  co2_elevated_max: 1000,
  co2_high_max: 1200,
  speed_normal_pct: 35,
  speed_elevated_pct: 50,
  speed_high_pct: 70,
  speed_max_pct: 90,
  night_enabled: true,
  night_start_hour: 22,
  night_end_hour: 7,
  night_max_pct: 30,
  fireplace_supply_pct: 55,
  fireplace_exhaust_pct: 30,
  hood_supply_pct: 80,
  hood_exhaust_pct: 80,
};

export type HubLightState = {
  on: boolean;
  brightness: number | null;
  name?: string;
};

export type ShellyDeviceConfig = {
  /** shelly:{host} */
  id: string;
  host: string;
  name: string;
  model?: string;
  gen?: 1 | 2;
};

export type ShellyDiscoveredDevice = {
  host: string;
  name: string;
  model?: string;
  gen?: 1 | 2;
  online: boolean;
  switch_channels?: number;
  capabilities?: string[];
};

export type TasmotaDeviceConfig = {
  /** tasmota:{host} */
  id: string;
  host: string;
  name: string;
  model?: string;
};

export type TasmotaDiscoveredDevice = {
  host: string;
  name: string;
  model?: string;
  online: boolean;
  switch_channels?: number;
  capabilities?: string[];
};

export type HubIntegrations = {
  shelly?: {
    devices: ShellyDeviceConfig[];
  };
  tasmota?: {
    devices: TasmotaDeviceConfig[];
  };
};

export type HubHomeDevice = {
  protocol: "zigbee" | "zwave" | "shelly" | "tasmota";
  kind: "light" | "switch" | "lock" | "fan" | "sensor" | "other";
  name: string;
  room?: string | null;
  on?: boolean;
  brightness?: number | null;
  controllable?: boolean;
  mqtt_set_topic?: string;
  node_id?: number;
  host?: string;
  channel?: number;
  gen?: number;
  model?: string;
  /** Shelly EM — kokonaisteho W */
  power_w?: number | null;
  /** Shelly EM — energia Wh */
  energy_wh?: number | null;
  em_a_power_w?: number | null;
  em_b_power_w?: number | null;
};

/** Web-käyttäjän asetukset laitteelle (ei Yellow-synkistä). */
export type HubDeviceOverride = {
  display_name?: string;
  room?: string | null;
  floor_anchor?: string | null;
  hidden?: boolean;
};

export type HubState = {
  co2_ppm?: number | null;
  humidity_pct?: number | null;
  temperature_c?: number | null;
  tvoc_ppb?: number | null;
  pm1_ugm3?: number | null;
  pm25_ugm3?: number | null;
  pm10_ugm3?: number | null;
  /** Tuloilma % (AirFi) */
  fan_supply_pct?: number | null;
  /** Poistoilma % (AirFi) */
  fan_exhaust_pct?: number | null;
  /** T1 ulkoilma °C (AirFi) */
  outdoor_temp_c?: number | null;
  /** T2 varalla (ei kaikissa koneissa) */
  supply_hru_temp_c?: number | null;
  /** T3 poistoilma koneelle °C (AirFi) */
  exhaust_temp_c?: number | null;
  /** T4 jäteilma ulos °C (AirFi) */
  exhaust_hru_temp_c?: number | null;
  /** T5 tuloilma asuntoon °C (AirFi) */
  supply_room_temp_c?: number | null;
  /** Ilmamäärä tulo m³/h (C-sarja) */
  supply_airflow_m3h?: number | null;
  /** Ilmamäärä poisto m³/h (C-sarja) */
  exhaust_airflow_m3h?: number | null;
  /** LTO lämpöhöytys % */
  lto_temp_efficiency_pct?: number | null;
  /** LTO energiahöytys % (painotettu ilmamäärällä/nopeudella) */
  lto_energy_efficiency_pct?: number | null;
  fan_supply_target?: number | null;
  fan_exhaust_target?: number | null;
  direct_control?: boolean;
  fireplace_active?: boolean;
  hood_active?: boolean;
  /** @deprecated käytä fan_supply_pct */
  fan_speed?: number | null;
  /** @deprecated */
  fan_speed_target?: number | null;
  away_mode?: boolean;
  emergency_stop?: boolean;
  fault?: boolean;
  satellite_count?: number;
  airthings_source?: "ble" | "cloud";
  /** Viimeisin onnistunut AirFi-lukema (ISO). */
  airfi_updated_at?: string | null;
  /** Hubin Modbus-lukema: onko AirFi tavoitettavissa lähiverkosta. */
  airfi_online?: boolean | null;
  /** Takkatila päättyy (ISO). */
  fireplace_until?: string | null;
  /** Liesituuletin-tila päättyy (ISO). */
  hood_until?: string | null;
  /** Poissa-tila päättyy (ISO), tyhjä jos rajaton. */
  away_until?: string | null;
  /** Poissa kunnes käsin lopetetaan. */
  away_unlimited?: boolean;
  /** Zigbee-valot (Yellow → Zigbee2MQTT). Avain = friendly_name tai zigbee:nimi. */
  lights?: Record<string, HubLightState>;
  /** Kaikki kodin laitteet (Zigbee + Z-Wave). Avain = zigbee:nimi / zwave:nodeId. */
  home_devices?: Record<string, HubHomeDevice>;
  /** Nimet, huoneet, piilotus — web UI. */
  device_overrides?: Record<string, HubDeviceOverride>;
  /** Integraatioiden konfiguraatio (web → Yellow). */
  integrations?: HubIntegrations;
  /** Yellow-verkkoscanin löytämät Shellyt. */
  shelly_discovered?: ShellyDiscoveredDevice[];
  /** Yellow-verkkoscanin löytämät Tasmota-laitteet. */
  tasmota_discovered?: TasmotaDiscoveredDevice[];
};

export type Hub = {
  id: string;
  user_id: string;
  name: string;
  device_type: string;
  firmware_version: string | null;
  last_seen_at: string | null;
  control_mode: HubControlMode;
  state: HubState;
  config: VentilationConfig;
  created_at: string;
  updated_at: string;
};

export type DeviceSyncRequest = {
  state?: HubState;
  firmware_version?: string;
  acked_command_ids?: string[];
};

export type DeviceSyncDisplay = {
  mode: HubControlMode;
  mode_label: string;
  timer_text: string | null;
  co2_band_label: string | null;
};

export type DeviceSyncResponse = {
  control_mode: HubControlMode;
  config: VentilationConfig;
  commands: Array<{
    id: string;
    command: string;
    payload: Record<string, unknown>;
  }>;
  sensor?: HubState;
  ventilation?: HubState;
  display?: DeviceSyncDisplay;
  integrations?: HubIntegrations;
};

export type ControlMode = HubControlMode;
export type Controller = Hub;
export type ControllerState = HubState;
export type AutomationConfig = VentilationConfig;
export const DEFAULT_CONFIG = DEFAULT_VENTILATION_CONFIG;
