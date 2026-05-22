import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
  type HeatPumpSlug,
} from "@/constants/heat-pumps";

export type BidTermTemplateTarget =
  | "scope_terms"
  | "contract_terms"
  | "warranty_work"
  | "warranty_equipment";

export type BidTermTemplate = {
  id: string;
  label: string;
  target: BidTermTemplateTarget;
  text: string;
  /** Jos puuttuu, malli näkyy kaikilla työlajeilla. */
  jobTypeSlugs?: readonly HeatPumpSlug[];
};

/** Valmiit mallit — suodatetaan tarjouspyynnön lämpöpumpputyypin mukaan. */
export const BID_TERM_TEMPLATES: BidTermTemplate[] = [
  {
    id: "scope_basic_ilp",
    label: "Perusasennus (ILP)",
    target: "scope_terms",
    jobTypeSlugs: ["ilmalampopumppu"],
    text: `Hinta sisältää ilmalämpöpumpun perusasennuksen:
• Sisä- ja ulkoyksikön asennus sovitulle paikalle
• Kylmäaineputket ja sähkökytkentä normaalietäisyydellä (max. n. 5 m)
• Tyhjiötyö, käyttöönotto ja perusasetukset
• Jäte- ja pakkausmateriaalien poisvienti

Ei sisällä: sähköpääkeskuksen muutoksia, rakennuslupia, maatelineitä, poikkeuksellisia materiaalilisätarpeita.`,
  },
  {
    id: "scope_basic_ivlp",
    label: "Perusasennus (VILP)",
    target: "scope_terms",
    jobTypeSlugs: ["ilmavesilampopumppu"],
    text: `Hinta sisältää vesi-ilmalämpöpumpun perusasennuksen:
• Lämpöpumppuyksikkö ja lämmönjakopiiri kohteeseen
• Putkistot ja eristeet normaalietäisyydellä (max. n. 5 m putkea)
• Sähkökytkentä, täyttö, ilmaus ja käyttöönotto
• Perusasetukset ja käyttöopastus

Ei sisällä: vanhan lämmitysjärjestelmän purkua, sähköpääkeskuksen uusintaa, poikkeuksellisia putkireittejä tai lupakuluja.`,
  },
  {
    id: "scope_basic_maalamp",
    label: "Perusasennus (maalämpö)",
    target: "scope_terms",
    jobTypeSlugs: ["maalampopumppu"],
    text: `Hinta sisältää maalämpöjärjestelmän perusasennuksen:
• Maalämpöpumppu ja lämmönjakopiiri
• Keruupiiri normaalikohteessa (poraus/syvyys sovitaan erikseen)
• Putkistot, eristeet, täyttö ja käyttöönotto
• Dokumentointi ja käyttöopastus

Ei sisällä: poikkeuksellisen pitkiä porausmatkoja, sähkökeskuksen uusintaa, kaivutöitä kolmannen osapuolen toimesta.`,
  },
  {
    id: "scope_turnkey_ilp",
    label: "Avaimet käteen (ILP)",
    target: "scope_terms",
    jobTypeSlugs: ["ilmalampopumppu"],
    text: `Avaimet käteen -toimitus (ilmalämpöpumppu):
• Suunnittelu, laitteet ja asennus yhdellä sopimuksella
• Käyttöönotto, dokumentointi ja käyttöopastus
• Takuu työlle ja toimittajalaitteille erikseen mainittuna`,
  },
  {
    id: "scope_turnkey_ivlp",
    label: "Avaimet käteen (VILP)",
    target: "scope_terms",
    jobTypeSlugs: ["ilmavesilampopumppu"],
    text: `Avaimet käteen -toimitus (vesi-ilmalämpöpumppu):
• Laitteet, putkityöt ja käyttöönotto
• Vanhan lämmön poiskytkentä sovitaan erillisellä rivillä tarvittaessa
• Dokumentointi ja käyttöopastus`,
  },
  {
    id: "scope_turnkey_maalamp",
    label: "Avaimet käteen (maalämpö)",
    target: "scope_terms",
    jobTypeSlugs: ["maalampopumppu"],
    text: `Avaimet käteen -toimitus (maalämpö):
• Maalämpöpumppu, keruupiiri ja lämmönjako
• Käyttöönotto ja dokumentointi
• Porausmetrit ja maaperätyypit tarkennetaan kohteessa`,
  },
  {
    id: "contract_standard",
    label: "Sopimusehdot (yleinen)",
    target: "contract_terms",
    text: `Maksuehdot: 30 % ennakkomaksu tilauksen vahvistuksessa, loppulasku valmistuttua työn.
Laskun maksuaika 14 pv netto.

Työn aloitus sovitaan erikseen. Asiakas varmistaa esteettömän pääsyn kohteeseen.

Peruutus: yli 7 vrk ennen sovittua aloitusta ilman maksua; myöhemmin peruutuksesta veloitetaan jo tilatut materiaalit ja varattu työaika.

Force majeure: emme vastaa viivästyksistä ylivoimaisen esteen vuoksi.`,
  },
  {
    id: "warranty_work_2y",
    label: "Työtakuu 2 v",
    target: "warranty_work",
    text: `Asennustyölle 2 vuoden takuu valmistumispäivästä. Takuu kattaa asennusvirheet; ei kulumista tai asiakkaan aiheuttamia vaurioita.`,
  },
  {
    id: "warranty_equipment_mfg",
    label: "Laitetakuu (valmistaja)",
    target: "warranty_equipment",
    text: `Laitteelle valmistajan takuu voimassa olevan ehdon mukaisesti. Asennustakuu erikseen työehdoissa.`,
  },
];

export function templatesForTarget(
  target: BidTermTemplateTarget,
  jobTypeSlug?: string | null,
): BidTermTemplate[] {
  return BID_TERM_TEMPLATES.filter((t) => {
    if (t.target !== target) return false;
    if (!t.jobTypeSlugs || t.jobTypeSlugs.length === 0) return true;
    if (!jobTypeSlug) return false;
    return (t.jobTypeSlugs as readonly string[]).includes(jobTypeSlug);
  });
}

export function heatPumpLabelForSlug(slug: string | null): string | null {
  if (!slug || !(HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug)) {
    return null;
  }
  return HEAT_PUMP_MARKETING[slug as HeatPumpSlug].title;
}
