export type RefrigerantLicense = "over_3kg" | "under_3kg" | "none";

/** Sähkötöiden johtajan pätevyys (SETI / Tukes). */
export type ElectricalQualification =
  | "s1"
  | "s2"
  | "s3"
  | "none"
  | "subcontract";

/** LVI- ja putkityöpätevyydet — voi valita useita. */
export type LviQualification =
  | "putki_asentaja"
  | "markatila_vedeneristaja"
  | "viemarisaneeraaja"
  | "subcontract"
  | "none";

export type ContractorQualifications = {
  refrigerant_license: RefrigerantLicense | null;
  electrical_qualification: ElectricalQualification | null;
  lvi_qualifications: LviQualification[];
  job_type_ids: string[];
};

export const REFRIGERANT_LICENSE_LABELS: Record<RefrigerantLicense, string> = {
  over_3kg: "Kylmäainelupa yli 3 kg",
  under_3kg: "Kylmäainelupa alle 3 kg",
  none: "Ei kylmäainelupaa",
};

export const ELECTRICAL_QUALIFICATION_OPTIONS: {
  value: ElectricalQualification;
  label: string;
  hint: string;
}[] = [
  {
    value: "s1",
    label: "S1 — kaikki sähkötyöt",
    hint: "Myös yli 1000 V. Sähkötöiden johtajan pätevyystodistus (SETI/Tukes).",
  },
  {
    value: "s2",
    label: "S2 — asennukset enintään 1000 V",
    hint: "Tyypillinen omakoti- ja kiinteistösähkö. Lämpöpumpun sähköasennus usein S2- tai S3-alueella.",
  },
  {
    value: "s3",
    label: "S3 — laitteet ja rajatut asennukset",
    hint: "Esim. yksittäinen laite ryhmäjohdolle, korjaus. Ei laajoja kiinteitä asennuksia.",
  },
  {
    value: "subcontract",
    label: "Sähkötyöt alihankkijalla",
    hint: "Tarjoat laitteen/työn — sähkö tekee sopiva S2/S3-urakoitsija.",
  },
  {
    value: "none",
    label: "En tee sähkötyötä itse",
    hint: "Kerro tarjouksessa miten sähkö hoidetaan.",
  },
];

export const LVI_QUALIFICATION_OPTIONS: {
  value: LviQualification;
  label: string;
  hint: string;
  exclusive?: boolean;
}[] = [
  {
    value: "putki_asentaja",
    label: "LVI-asentaja / putkimies",
    hint: "Koulutus tai työkokemus käyttövesi-, lämmitys- ja viemäriputkista.",
  },
  {
    value: "markatila_vedeneristaja",
    label: "Märkätilojen vedeneristäjän sertifikaatti",
    hint: "Rakentamisen sertifikaatti (Eurofins). Kylpyhuone- ja märkätilatyöt.",
  },
  {
    value: "viemarisaneeraaja",
    label: "Viemärisaneeraajan sertifikaatti",
    hint: "Rakentamisen sertifikaatti viemäriputkien saneeraukseen.",
  },
  {
    value: "subcontract",
    label: "LVI-työt alihankkijalla",
    hint: "Putkiliitännät tai märkätilatyöt alihankkijalla.",
    exclusive: true,
  },
  {
    value: "none",
    label: "En tee LVI-työtä itse",
    hint: "Esim. vain laitetoimitus — kerro tarjouksessa.",
    exclusive: true,
  },
];

/** @deprecated Vanha binääri — vain migraatioyhteensopivuus */
export type WorkCapability = "qualified" | "not_qualified";
