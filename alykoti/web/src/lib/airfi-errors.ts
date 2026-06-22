export const AIRFI_ERROR_BITS = [
  { code: "E0", value: 1, label: "Yleishälytys" },
  { code: "E1", value: 2, label: "Koneen puhaltimien ulkopuolinen pysäytys" },
  { code: "E2", value: 4, label: "Ohituspellin toimintahäiriö" },
  { code: "E3", value: 8, label: "Tulopuhallin ei pyöri" },
  { code: "E4", value: 16, label: "Poistopuhallin ei pyöri" },
  { code: "E5", value: 32, label: "Vesipatterin jäätymissuoja" },
  { code: "E6", value: 64, label: "Anturivirhe" },
  { code: "E7", value: 128, label: "Huurtumissuojan painelähetin rikki" },
  { code: "E8", value: 256, label: "Tulo- ja poistopuhaltimen lämpötilat virheellisiä" },
  { code: "E9", value: 512, label: "Vakiopainesäätö-hälytys" },
] as const;

export function decodeAirfiErrors(raw: number): { code: string; label: string }[] {
  const value = Math.trunc(raw);
  if (!Number.isFinite(value) || value <= 0) return [];
  return AIRFI_ERROR_BITS.filter((bit) => (value & bit.value) !== 0).map((bit) => ({
    code: bit.code,
    label: bit.label,
  }));
}

export function airfiErrorCodes(raw: number): string[] {
  return decodeAirfiErrors(raw).map((e) => e.code);
}
