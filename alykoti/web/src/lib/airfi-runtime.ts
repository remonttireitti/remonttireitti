function envHost(): string {
  return process.env.AIRFI_MODBUS_HOST ?? "192.168.50.26";
}

/** Onko osoite RFC1918 / loopback (ei tavoitettavissa Vercelistä). */
export function isPrivateLanHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** Voiko tämä palvelin yrittää suoraa Modbus TCP -yhteyttä AirFiin. */
export function canPingAirfiFromRuntime(): boolean {
  if (process.env.AIRFI_MODBUS_SKIP === "1") return false;
  const host = envHost();
  if (!isPrivateLanHost(host)) return true;
  return process.env.VERCEL !== "1";
}
