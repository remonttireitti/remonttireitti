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
};

/** Valmiit mallit — urakoitsija voi lisätä kenttään tai korvata sisällön. */
export const BID_TERM_TEMPLATES: BidTermTemplate[] = [
  {
    id: "scope_basic_ilp",
    label: "Perusasennus (ILP)",
    target: "scope_terms",
    text: `Hinta sisältää perusasennuksen:
• Sisä- ja ulkoyksikön asennus sovitulle paikalle
• Putkistot ja kaapeloinnit normaalietäisyydellä (max. n. 5 m)
• Tyhjiötyö, käyttöönotto ja perusasetukset
• Jäte- ja pakkausmateriaalien poisvienti

Ei sisällä: sähköpääkeskuksen muutoksia, rakennuslupia, maansiirtoa, korkean telineen vuokraa, poikkeuksellisia materiaalilisätarpeita.`,
  },
  {
    id: "scope_turnkey",
    label: "Avaimet käteen",
    target: "scope_terms",
    text: `Avaimet käteen -toimitus:
• Suunnittelu, laitteet ja asennus yhdellä sopimuksella
• Käyttöönotto, dokumentointi ja käyttöopastus
• Takuu työlle ja toimittajalaitteille erikseen mainittuna`,
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
): BidTermTemplate[] {
  return BID_TERM_TEMPLATES.filter((t) => t.target === target);
}
