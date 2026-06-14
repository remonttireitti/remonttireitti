import type { HeatPumpSlug } from "@/constants/heat-pumps";

export type HeatPumpBrandSlug =
  | "mitsubishi"
  | "daikin"
  | "panasonic"
  | "bosch"
  | "midea"
  | "muu";

export const HEAT_PUMP_BRAND_OPTIONS: {
  slug: HeatPumpBrandSlug;
  label: string;
}[] = [
  { slug: "mitsubishi", label: "Mitsubishi Electric" },
  { slug: "daikin", label: "Daikin" },
  { slug: "panasonic", label: "Panasonic" },
  { slug: "bosch", label: "Bosch / Buderus" },
  { slug: "midea", label: "Midea / Rotenso" },
  { slug: "muu", label: "Muu / en tiedä" },
];

export type HeatPumpErrorCodeEntry = {
  code: string;
  brands: HeatPumpBrandSlug[];
  pumps?: HeatPumpSlug[];
  title: string;
  meaning: string;
  safeAction: string;
  callPro: boolean;
};

export const HEAT_PUMP_ERROR_CODES: HeatPumpErrorCodeEntry[] = [
  {
    code: "E09",
    brands: ["mitsubishi"],
    title: "Sulatus / ulkoyksikön jää",
    meaning: "Ulkoyksikön sulatus ei onnistu tai anturi raportoi ongelmaa.",
    safeAction:
      "Tarkista ettei ulkoyksikkö ole lumen tai jään peitossa. Odota sulatusta. Yksi virtakatkaisu 5 min.",
    callPro: true,
  },
  {
    code: "U4",
    brands: ["mitsubishi"],
    title: "Viestintä sisä–ulkoyksikön välillä",
    meaning: "Sisä- ja ulkoyksikkö eivät kommunikoi (johto, liitin tai virta).",
    safeAction:
      "Tarkista että molemmat yksiköt saavat virtaa ja sulake ei ole palanut. Ei johdon avausta.",
    callPro: true,
  },
  {
    code: "L3",
    brands: ["mitsubishi"],
    title: "Ulkoyksikön kompressori / piiri",
    meaning: "Kompressorin tai invertterin suojapiiri on lauennut.",
    safeAction: "Sammuta virta 5 min ja käynnistä kerran. Älä toista useasti.",
    callPro: true,
  },
  {
    code: "A5",
    brands: ["daikin"],
    title: "Sisäyksikön jäätyminen / sulatus",
    meaning: "Sisäpuolen kennon lämpötila poikkeaa — usein likainen suodatin tai sulatus.",
    safeAction: "Puhdista ilmansuodatin. Anna laitteen sulattaa rauhassa.",
    callPro: false,
  },
  {
    code: "U0",
    brands: ["daikin"],
    title: "Kylmäaine / paine",
    meaning: "Painetta ei saavuteta — mahdollinen vuoto tai kompressorivika.",
    safeAction: "Älä jatka käyttöä toistuvasti. Kirjaa koodi ja ota kuva näytöstä.",
    callPro: true,
  },
  {
    code: "H6",
    brands: ["daikin"],
    title: "Puhallinmoottori",
    meaning: "Sisä- tai ulkoyksikön tuuletin ei pyöri odotetusti.",
    safeAction:
      "Tarkista ettei puhallinta estä lika. Yksi uudelleenkäynnistys. Ei purkamista.",
    callPro: true,
  },
  {
    code: "H16",
    brands: ["panasonic"],
    title: "Ulkoyksikön anturi / lämpötila",
    meaning: "Ulkoyksikön anturi tai lämpötila poikkeaa normaalista.",
    safeAction: "Poista lumi esteet ulkoyksikön ympäriltä. Odota 15 min.",
    callPro: true,
  },
  {
    code: "F11",
    brands: ["panasonic"],
    title: "Sisä–ulkoyksikön yhteys",
    meaning: "Signaalivika tai kaapelivika yksiköiden välillä.",
    safeAction: "Tarkista virta molemmissa yksiköissä. Ei kaapelien avaamista.",
    callPro: true,
  },
  {
    code: "E1",
    brands: ["bosch", "midea"],
    title: "Sisäyksikön anturi",
    meaning: "Huoneen tai kennon lämpötila-anturi raportoi virheen.",
    safeAction: "Sammuta virta 5 min. Jos koodi palaa, älä jatka itse.",
    callPro: true,
  },
  {
    code: "E4",
    brands: ["bosch", "midea"],
    title: "Paine / kylmäainepiiri",
    meaning: "Paine poikkeaa — vuoto, tukos tai kompressorivika mahdollinen.",
    safeAction: "Sammuta laite. Älä tee kylmäainetyötä itse.",
    callPro: true,
  },
  {
    code: "P01",
    brands: ["midea"],
    title: "Matala paine",
    meaning: "Järjestelmän paine on liian matala.",
    safeAction: "Yksi uudelleenkäynnistys. Seuraa toistuuko koodi.",
    callPro: true,
  },
  {
    code: "E0",
    brands: ["mitsubishi", "daikin", "panasonic", "bosch", "midea", "muu"],
    title: "Yleinen anturi / viestintä",
    meaning: "Usein anturi, sulatus tai väliaikainen häiriö — tarkista ohjekirja.",
    safeAction: "Kirjaa koodi, ota kuva, yksi virtakatkaisu 5 min.",
    callPro: false,
  },
];

export function normalizeErrorCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function lookupHeatPumpErrorCode(
  code: string,
  brand?: HeatPumpBrandSlug | null,
): HeatPumpErrorCodeEntry | null {
  const normalized = normalizeErrorCode(code);
  if (!normalized) return null;

  const exact = HEAT_PUMP_ERROR_CODES.filter(
    (e) => normalizeErrorCode(e.code) === normalized,
  );
  if (exact.length === 0) return null;

  if (brand && brand !== "muu") {
    const brandMatch = exact.find((e) => e.brands.includes(brand));
    if (brandMatch) return brandMatch;
  }

  return exact[0] ?? null;
}

export function searchHeatPumpErrorCodes(
  query: string,
  brand?: HeatPumpBrandSlug | null,
): HeatPumpErrorCodeEntry[] {
  const normalized = normalizeErrorCode(query);
  if (!normalized) return [];

  return HEAT_PUMP_ERROR_CODES.filter((entry) => {
    if (!normalizeErrorCode(entry.code).includes(normalized)) return false;
    if (brand && brand !== "muu" && !entry.brands.includes(brand)) return false;
    return true;
  }).slice(0, 8);
}
