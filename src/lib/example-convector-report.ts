/** Fiktiivinen esimerkkiraportti — ei oikeita asiakkaita, laitteita tai henkilöitä. */

export type InspectionCheck = "ok" | "fail" | "na";

export type ConvectorChecks = {
  suod: InspectionCheck;
  kenno: InspectionCheck;
  kond: InspectionCheck;
  puh: InspectionCheck;
  vent: InspectionCheck;
  ohj: InspectionCheck;
};

export type ConvectorUnit = {
  index: number;
  title: string;
  code: string;
  model: string;
  serial: string | null;
  fluid: string;
  airFlowM3h: number | null;
  airPowerKw: number | null;
  waterFlowLs: number | null;
  supplyC: number | null;
  returnC: number | null;
  roomC: number | null;
  checks: ConvectorChecks;
  note: string | null;
  /** Punertava kehys = vika tai korjaus. Vihreä = kaikki OK. */
  hasFault: boolean;
  showDiagram: boolean;
};

export type ExampleConvectorReport = {
  title: string;
  subtitle: string;
  dateIso: string;
  dateLabel: string;
  company: {
    name: string;
    businessId: string;
    address: string;
    phone: string;
    email: string;
  };
  customer: {
    name: string;
    address: string;
  };
  site: {
    description: string;
    area: string;
  };
  maintenanceDone: boolean;
  faultFound: boolean;
  performer: string;
  tukes: string;
  notes: string;
  units: ConvectorUnit[];
};

const ALL_OK: ConvectorChecks = {
  suod: "ok",
  kenno: "ok",
  kond: "ok",
  puh: "ok",
  vent: "ok",
  ohj: "ok",
};

const PARTIAL_OFF: ConvectorChecks = {
  suod: "ok",
  kenno: "ok",
  kond: "na",
  puh: "na",
  vent: "na",
  ohj: "ok",
};

const NONE: ConvectorChecks = {
  suod: "na",
  kenno: "na",
  kond: "na",
  puh: "na",
  vent: "na",
  ohj: "na",
};

const MODEL = "Kasetti KC-32";
const FLUID = "Vesi";

function unit(
  index: number,
  code: string,
  serial: string | null,
  opts: {
    note: string | null;
    hasFault: boolean;
    showDiagram?: boolean;
    checks?: ConvectorChecks;
    airFlowM3h?: number | null;
    airPowerKw?: number | null;
    waterFlowLs?: number | null;
    supplyC?: number | null;
    returnC?: number | null;
    roomC?: number | null;
  },
): ConvectorUnit {
  const running = opts.showDiagram !== false && opts.airPowerKw !== null;
  return {
    index,
    title: "Kattokonvektori",
    code,
    model: MODEL,
    serial,
    fluid: FLUID,
    airFlowM3h: opts.airFlowM3h === undefined ? 700 : opts.airFlowM3h,
    airPowerKw: opts.airPowerKw === undefined ? (running ? 2.23 : null) : opts.airPowerKw,
    waterFlowLs: opts.waterFlowLs === undefined ? (running ? 0.178 : null) : opts.waterFlowLs,
    supplyC: opts.supplyC === undefined ? (running ? 10.5 : null) : opts.supplyC,
    returnC: opts.returnC === undefined ? (running ? 13.5 : null) : opts.returnC,
    roomC: opts.roomC === undefined ? (running ? 22 : null) : opts.roomC,
    checks: opts.checks ?? ALL_OK,
    note: opts.note,
    hasFault: opts.hasFault,
    showDiagram: opts.showDiagram !== false,
  };
}

export const EXAMPLE_CONVECTOR_REPORT: ExampleConvectorReport = {
  title: "Huoltopöytäkirja",
  subtitle:
    "Esimerkki Huolto Oy – Esimerkki asiakas – Esimerkkikohteen myymäläverkosto",
  dateIso: "2026-01-01",
  dateLabel: "01.01.2026",
  company: {
    name: "Esimerkki Huolto Oy",
    businessId: "1234567-8",
    address: "Esimerkkikatu 1, 00100 Helsinki",
    phone: "040 123 4567",
    email: "esimerkki@huolto.fi",
  },
  customer: {
    name: "Esimerkki asiakas",
    address: "Asiakaskatu 10, 00100 Helsinki",
  },
  site: {
    description: "Esimerkkikohteen myymäläverkosto",
    area: "Esimerkkikohde",
  },
  maintenanceDone: true,
  faultFound: true,
  performer: "Esimerkki tekijä",
  tukes: "000/00/0000",
  notes:
    "Tehomittauksessa käytetyt ilmamäärät ovat 700 m³/h. Tämä on esimerkkiraportti — kaikki nimet, tunnisteet ja havainnot ovat keksittyjä.",
  units: [
    unit(1, "Kv-01", "EK-10001", {
      note: "Puhallin äänekäs",
      hasFault: true,
    }),
    unit(2, "Kv-02", "EK-10002", {
      note: "Puhallin äänekäs",
      hasFault: true,
    }),
    unit(3, "Kv-03", "EK-10003", {
      note: "Operation-valo palaa, puhallin ei pyöri. Kortti uusittu ja kaikki toimii. Kortti leveämpi, kansi ei mahdu kiinni.",
      hasFault: true,
    }),
    unit(4, "Kv-04", "EK-10004", {
      note: null,
      hasFault: false,
    }),
    unit(5, "Kv-05", "EK-10005", {
      note: "Kaikki valot vilkkuvat, ei lähde jäähdyttämään. J17-liittimen jumppi puuttui. Asennettu jumppi varakoneesta. Kaikki toimii.",
      hasFault: true,
    }),
    unit(6, "Kv-06", "EK-10006", {
      note: null,
      hasFault: false,
    }),
    unit(7, "Kv-07", null, {
      note: "Laite hyllyn päällä, ei avattavissa, sulku kiinni.",
      hasFault: true,
      showDiagram: false,
      checks: NONE,
      airFlowM3h: 700,
      airPowerKw: null,
      waterFlowLs: null,
      supplyC: null,
      returnC: null,
      roomC: null,
    }),
    unit(8, "Kv-08", "EK-10008", {
      note: null,
      hasFault: false,
    }),
    unit(9, "Kv-09", "EK-10009", {
      note: "Kaikki valot vilkkuvat, ei lähde jäähdyttämään. Kortilta puuttui jumppi; jumppi otettu Kv-06-koneesta.",
      hasFault: true,
    }),
    unit(10, "Kv-10", "EK-10010", {
      note: "Kondenssiveden pumppu ei käynnisty. Pumppu uusittu.",
      hasFault: true,
    }),
    unit(11, "Kv-11", "EK-10011", {
      note: "Varasto — muista huoltaa seuraavalla käynnillä.",
      hasFault: false,
    }),
    unit(12, "Kv-12", "EK-10012", {
      note: "Toimii, vaikka operation- ja standby-tilan valot palavat jatkuvasti.",
      hasFault: false,
    }),
    unit(13, "Kv-13", "EK-10013", {
      note: "Kondenssiveden pumppu pumppaa heikosti, valumajälkiä ritilässä. Pumpun tärinänvaimennukset rikki. Varakoneesta otettu kumit ja jumppi.",
      hasFault: true,
    }),
    unit(14, "Kv-14", "EK-10014", {
      note: "Veden sulku oli kiinni, vaikka kaikki näyttäisi toimivan.",
      hasFault: true,
    }),
    unit(15, "Kv-15", "EK-10015", {
      note: "Laite standby-tilassa, ei käynnisty. Kortti uusittu, ei vaikutusta.",
      hasFault: true,
      showDiagram: false,
      checks: PARTIAL_OFF,
      airPowerKw: null,
      waterFlowLs: null,
      supplyC: null,
      returnC: null,
      roomC: null,
    }),
    unit(16, "Kv-16", "EK-10016", {
      note: "Kondenssiveden pumppu uusittu. Pumpusta kuuluu jatkuvaa jankuttavaa ääntä.",
      hasFault: true,
    }),
  ],
};

export const CONVECTOR_CHECK_LEGEND = [
  { key: "suod", label: "Suod", detail: "Suodatin puhdistettu ja ehjä" },
  { key: "kenno", label: "Kenno", detail: "Kenno puhdas" },
  { key: "kond", label: "Kond", detail: "Kondenssiveden poisto testattu" },
  { key: "puh", label: "Puh", detail: "Puhallinnopeudet toimivat eikä ole sivuääniä" },
  { key: "vent", label: "Vent", detail: "Venttiili ja toimilaite testattu ja toimii" },
  { key: "ohj", label: "Ohj", detail: "Ohjaus toimii tarkoituksenmukaisesti" },
] as const;

export function formatFiNumber(value: number, digits = 2): string {
  return value.toLocaleString("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
