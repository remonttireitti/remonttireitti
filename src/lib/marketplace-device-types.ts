/** Remonttiin liittyvät laitetyypit (tallennetaan equipment_listings.pump_type_slug). */

export type DeviceTypeOption = {
  value: string;
  label: string;
};

export type DeviceTypeGroup = {
  label: string;
  options: DeviceTypeOption[];
};

export const MARKETPLACE_DEVICE_TYPE_GROUPS: DeviceTypeGroup[] = [
  {
    label: "Lämmitys & ilmastointi",
    options: [
      { value: "ilmalampopumppu", label: "Ilmalämpöpumppu" },
      { value: "ilmavesilampopumppu", label: "Vesi-ilmalämpöpumppu" },
      { value: "maalampopumppu", label: "Maalämpöpumppu" },
      { value: "poistoilmalampopumppu", label: "Poistoilmalämpöpumppu" },
      { value: "kattila", label: "Kattila / lämminvesivaraaja" },
      { value: "patteri", label: "Patteri / lämmönjakaja" },
      { value: "ilmanvaihto", label: "Ilmanvaihtokone / -järjestelmä" },
      { value: "ilmastointi", label: "Ilmastointilaite / split" },
      { value: "takka-kamiina", label: "Takka / kamiina / takkalämpöpumppu" },
    ],
  },
  {
    label: "Keittiö",
    options: [
      { value: "liesi", label: "Liesi / uuni" },
      { value: "liesituuletin", label: "Liesituuletin" },
      { value: "astianpesukone", label: "Astianpesukone" },
      { value: "jääkaappi", label: "Jääkaappi / pakastin" },
      { value: "keittio-allas", label: "Keittiöallas / hana" },
      { value: "keittio-kaappi", label: "Keittiökaappi / tasot" },
    ],
  },
  {
    label: "Kylpyhuone & pesu",
    options: [
      { value: "pesukone", label: "Pesukone" },
      { value: "kuivausrumpu", label: "Kuivausrumpu" },
      { value: "kylpyamme", label: "Kylpyamme / poreamme" },
      { value: "suihkuseina", label: "Suihkuseinä / suihkukaappi" },
      { value: "wc-istuin", label: "WC-istuin / bidee" },
      { value: "pesuallas", label: "Pesuallas / allaskaappi" },
    ],
  },
  {
    label: "Sauna",
    options: [
      { value: "saunakiuas", label: "Saunakiuas" },
      { value: "sahkosauna", label: "Sähkösauna / infrapun" },
      { value: "saunamoottori", label: "Saunamoottori / höyrystin" },
    ],
  },
  {
    label: "Sähkö & energia",
    options: [
      { value: "aurinkopaneeli", label: "Aurinkopaneeli / invertteri" },
      { value: "latauspiste", label: "Sähköauton latauspiste" },
      { value: "sahkokeskus", label: "Sähkökeskus / jakotaso" },
      { value: "generaattori", label: "Generaattori / UPS" },
    ],
  },
  {
    label: "Rakennus & remontti",
    options: [
      { value: "ikkuna", label: "Ikkuna / ovi" },
      { value: "lattialammitys", label: "Lattialämmitysjärjestelmä" },
      { value: "vesikaluste", label: "Vesikaluste / pumppuasema" },
      { value: "ilmanpuhdistin", label: "Ilmanpuhdistin / kosteudenpoisto" },
    ],
  },
  {
    label: "Muu",
    options: [{ value: "muu", label: "Muu remonttilaite" }],
  },
];

export const MARKETPLACE_DEVICE_TYPE_OPTIONS: DeviceTypeOption[] =
  MARKETPLACE_DEVICE_TYPE_GROUPS.flatMap((g) => g.options);

const labelBySlug = new Map(
  MARKETPLACE_DEVICE_TYPE_OPTIONS.map((o) => [o.value, o.label] as const),
);

/** Vanhat arvot ja vapaamuotoinen teksti. */
const LEGACY_LABELS: Record<string, string> = {
  varaosa: "Varaosa / muu",
};

export function formatDeviceTypeLabel(slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null;
  return labelBySlug.get(slug) ?? LEGACY_LABELS[slug] ?? slug;
}
