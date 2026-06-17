import type { HubState } from "@/lib/types";

const TOKEN_URL = "https://accounts-api.airthings.com/v1/token";
const API_BASE = "https://ext-api.airthings.com/v1";

type TokenCache = { accessToken: string; expiresAt: number };
type SamplesCache = { state: HubState; fetchedAt: number };

let tokenCache: TokenCache | null = null;
let samplesCache: SamplesCache | null = null;

const SAMPLE_TTL_MS = 5 * 60 * 1000;

function getConfig() {
  const clientId = process.env.AIRTHINGS_CLIENT_ID;
  const clientSecret = process.env.AIRTHINGS_CLIENT_SECRET;
  const serial = process.env.AIRTHINGS_DEVICE_SERIAL;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, serial };
}

async function fetchAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: ["read:device:current_values"],
    }),
  });

  if (!res.ok) {
    throw new Error(`Airthings token failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function resolveDeviceSerial(
  token: string,
  preferred?: string,
): Promise<string | null> {
  if (preferred) return preferred;

  const res = await fetch(`${API_BASE}/devices?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    devices?: Array<{ id: string }>;
  };
  return data.devices?.[0]?.id ?? null;
}

function mapSamples(data: Record<string, unknown>): HubState {
  const state: HubState = {};
  if (typeof data.co2 === "number") state.co2_ppm = data.co2;
  if (typeof data.humidity === "number") state.humidity_pct = data.humidity;
  if (typeof data.temp === "number") state.temperature_c = data.temp;
  if (typeof data.voc === "number") state.tvoc_ppb = data.voc;
  if (typeof data.pm1 === "number") state.pm1_ugm3 = data.pm1;
  if (typeof data.pm25 === "number") state.pm25_ugm3 = data.pm25;
  if (typeof data.pm10 === "number") state.pm10_ugm3 = data.pm10;
  return state;
}

export async function fetchAirthingsState(): Promise<HubState | null> {
  const config = getConfig();
  if (!config) return null;

  if (samplesCache && Date.now() - samplesCache.fetchedAt < SAMPLE_TTL_MS) {
    return samplesCache.state;
  }

  try {
    const token = await fetchAccessToken(config.clientId, config.clientSecret);
    const serial = await resolveDeviceSerial(token, config.serial);
    if (!serial) return null;

    const res = await fetch(
      `${API_BASE}/devices/${serial}/latest-samples`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as { data?: Record<string, unknown> };
    if (!payload.data) return null;

    const state = mapSamples(payload.data);
    samplesCache = { state, fetchedAt: Date.now() };
    return state;
  } catch {
    return null;
  }
}

export function isAirthingsConfigured(): boolean {
  return getConfig() !== null;
}
