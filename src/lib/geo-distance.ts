/** Likimääräiset kuntakeskusten koordinaatit (WGS84) — varalla jos postinumero puuttuu. */
export const MUNICIPALITY_GEO: Record<string, { lat: number; lng: number }> = {
  helsinki: { lat: 60.1699, lng: 24.9384 },
  espoo: { lat: 60.2055, lng: 24.6559 },
  vantaa: { lat: 60.2941, lng: 25.04 },
  kauniainen: { lat: 60.212, lng: 24.729 },
  turku: { lat: 60.4518, lng: 22.2666 },
  tampere: { lat: 61.4978, lng: 23.761 },
  oulu: { lat: 65.0121, lng: 25.4651 },
  jyvaskyla: { lat: 62.2426, lng: 25.7473 },
  lahti: { lat: 60.9827, lng: 25.6612 },
  kuopio: { lat: 62.892, lng: 27.677 },
  pori: { lat: 61.485, lng: 21.797 },
  joensuu: { lat: 62.601, lng: 29.763 },
  lappeenranta: { lat: 61.058, lng: 28.188 },
  hameenlinna: { lat: 60.996, lng: 24.464 },
  vaasa: { lat: 63.096, lng: 21.6158 },
  seinajoki: { lat: 62.791, lng: 22.84 },
  rovaniemi: { lat: 66.5039, lng: 25.7294 },
  mikkeli: { lat: 61.688, lng: 27.272 },
  kotka: { lat: 60.466, lng: 26.946 },
  kouvola: { lat: 60.868, lng: 26.704 },
  porvoo: { lat: 60.393, lng: 25.664 },
  jarvenpaa: { lat: 60.474, lng: 25.09 },
  kerava: { lat: 60.404, lng: 25.105 },
  tuusula: { lat: 60.403, lng: 25.026 },
  hyvinkaa: { lat: 60.63, lng: 24.86 },
  nokia: { lat: 61.478, lng: 23.506 },
  kangasala: { lat: 61.464, lng: 24.076 },
  rauma: { lat: 61.127, lng: 21.511 },
  salo: { lat: 60.383, lng: 23.13 },
  kokkola: { lat: 63.838, lng: 23.13 },
  kemi: { lat: 65.736, lng: 24.564 },
  raahe: { lat: 64.684, lng: 24.479 },
  lohja: { lat: 60.25, lng: 24.065 },
  nummela: { lat: 60.335, lng: 24.32 },
  forssa: { lat: 60.814, lng: 23.621 },
};

export function normalizeMunicipalityKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/å/g, "a");
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function municipalityDistanceKm(
  municipalityA: string,
  municipalityB: string,
): number | null {
  const keyA = normalizeMunicipalityKey(municipalityA);
  const keyB = normalizeMunicipalityKey(municipalityB);
  if (keyA === keyB) return 0;

  const geoA = MUNICIPALITY_GEO[keyA];
  const geoB = MUNICIPALITY_GEO[keyB];
  if (!geoA || !geoB) return null;

  return Math.round(haversineKm(geoA.lat, geoA.lng, geoB.lat, geoB.lng));
}

export async function postalCodeDistanceKm(
  supabase: { rpc: (fn: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: unknown }> },
  postalA: string,
  postalB: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("distance_km_between_postal_codes", {
    postal_a: postalA.trim(),
    postal_b: postalB.trim(),
  });

  if (error || data == null || typeof data !== "number") {
    return null;
  }

  return Math.round(data);
}

export async function projectDistanceKm(
  supabase: Parameters<typeof postalCodeDistanceKm>[0],
  contractorPostal: string | null,
  contractorMunicipality: string | null,
  projectPostal: string,
  projectMunicipality: string,
): Promise<number | null> {
  if (contractorPostal?.trim()) {
    const byPostal = await postalCodeDistanceKm(
      supabase,
      contractorPostal,
      projectPostal,
    );
    if (byPostal != null) return byPostal;
  }

  if (contractorMunicipality?.trim()) {
    return municipalityDistanceKm(contractorMunicipality, projectMunicipality);
  }

  return null;
}
