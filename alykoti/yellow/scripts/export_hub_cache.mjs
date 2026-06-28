#!/usr/bin/env node
/** Vie hub-välimuisti Supabasesta (aja: vercel env run -- node scripts/export_hub_cache.mjs) */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const token = process.argv[2]?.trim() || process.env.ALYKOTI_DEVICE_TOKEN?.trim();

if (!url || !key || !token) {
  console.error("Tarvitaan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ja device token");
  process.exit(1);
}

const resp = await fetch(
  `${url.replace(/\/$/, "")}/rest/v1/hubs?device_token=eq.${encodeURIComponent(token)}&select=control_mode,config,state&limit=1`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  },
);

if (!resp.ok) {
  console.error("Supabase virhe:", resp.status, await resp.text());
  process.exit(1);
}

const rows = await resp.json();
const row = rows[0];
if (!row) {
  console.error("Hubia ei löytynyt");
  process.exit(1);
}

const hubConfig = row.config && typeof row.config === "object" ? row.config : {};
const state = row.state && typeof row.state === "object" ? row.state : {};
const automations = Array.isArray(hubConfig.automations)
  ? hubConfig.automations
  : Array.isArray(state.automations)
    ? state.automations
    : [];

const snap = {
  automations,
  integrations: state.integrations && typeof state.integrations === "object" ? state.integrations : {},
  home_devices: state.home_devices && typeof state.home_devices === "object" ? state.home_devices : {},
  hub_config: hubConfig,
  control_mode: typeof row.control_mode === "string" ? row.control_mode : "auto",
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".hub_cache.json");
writeFileSync(out, JSON.stringify(snap, null, 2), "utf8");
console.error(`OK automaatiot=${automations.length} laitteet=${Object.keys(snap.home_devices).length} → ${out}`);
