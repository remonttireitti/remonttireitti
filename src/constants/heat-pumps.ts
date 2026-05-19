/** MVP: näytettävät lämpöpumpputyypit (poistoilma piilotettu toistaiseksi). */
export const HEAT_PUMP_JOB_SLUGS = [
  "ilmalampopumppu",
  "ilmavesilampopumppu",
  "maalampopumppu",
] as const;

export type HeatPumpSlug = (typeof HEAT_PUMP_JOB_SLUGS)[number];

export const HEAT_PUMP_MARKETING: Record<
  HeatPumpSlug,
  { title: string; description: string; hint: string }
> = {
  ilmalampopumppu: {
    title: "Ilmalämpöpumppu",
    description: "Lämmitys ja viilennys ilmalämpöpumpulla.",
    hint: "Sopii useimpiin sähkölämmitettyihin taloihin.",
  },
  ilmavesilampopumppu: {
    title: "Vesi-ilmalämpöpumppu",
    description: "Lämmittää patteriverkoston tai lattialämmön.",
    hint: "Öljy- tai sähkölämmityksen tilalle.",
  },
  maalampopumppu: {
    title: "Maalämpöpumppu",
    description: "Maalämpökeruupiiri ja lämpöpumppu.",
    hint: "Korkea hyötysuhde, vaatii porausta.",
  },
};
