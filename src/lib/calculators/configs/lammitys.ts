import { buildCalculator, countInput, meterInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const LAMMITYS_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "ilmalampopumppu",
    title: "Ilmalämpöpumpun hintalaskuri",
    pageTitle: "Ilmalämpöpumppu laskuri — laite ja asennus",
    metaDescription:
      "Laske ilmalämpöpumpun hinta-arvio: laite, perusasennus, lisäputket ja sähkötyöt. Muokattavat hinnat — kilpailuta ilmaiseksi.",
    intro:
      "Arvioi ilmalämpöpumpun kokonaishinta. Perusasennus sisältää tyypillisesti noin 4 m putkituksen, seinäläpiviennin, kondenssiveden ohjauksen ja perussähköistyksen valmiista pistorasiasta.",
    areaSlug: "lammitys",
    primaryInput: countInput("Asennusten määrä", 1, "kpl", { min: 1, max: 4 }),
    secondaryInput: meterInput("Lisäputkimetrit (yli 4 m)", 0, {
      hint: "Perusasennukseen kuuluu noin 4 m putkia. Syötä ylimääräiset metrit.",
      max: 30,
    }),
    tiers: [
      {
        id: "perus",
        label: "Peruslaite",
        subtitle: "noin 3,5 kW",
        overrides: { laite: 1200 },
      },
      {
        id: "premium",
        label: "Tehokkaampi / premium",
        subtitle: "noin 5–7 kW, inverter",
        overrides: { laite: 2200 },
      },
    ],
    defaultTierId: "perus",
    lines: [
      {
        id: "laite",
        label: "Ilmalämpöpumppu (laite)",
        description:
          "Sisä- ja ulkoyksikkö. Hinta vaihtelee tehon, merkin ja ominaisuuksien mukaan.",
        unit: "fixed",
        amount: 1200,
        searchHint: "ilmalämpöpumppu hinta asennettuna",
      },
      {
        id: "asennus",
        label: "Perusasennus",
        description:
          "Sisältää noin 4 m kylmäaineputkia, seinäläpiviennin, ulkoyksikön kiinnityksen, kondenssiveden ohjauksen ja perussähköistyksen pistorasiasta.",
        unit: "fixed",
        amount: 750,
        searchHint: "ilmalämpöpumpun perusasennus hinta",
      },
      {
        id: "lisaputki",
        label: "Lisäputki (yli 4 m)",
        description: "Eristetyt putket, suojakouru ja kylmäainetäyttö — €/m yli perusasennuksen.",
        unit: "per_secondary",
        amount: 50,
        searchHint: "ilmalämpöpumppu lisäputki hinta metri",
      },
      {
        id: "sahko-taulu",
        label: "Sähköistys suoraan taululta",
        description: "Erillinen sähkösyöttö turvakytkimellä, jos pistorasia ei riitä.",
        unit: "fixed",
        amount: 260,
        searchHint: "ilmalämpöpumppu sähköistys taululta hinta",
      },
      {
        id: "maateline",
        label: "Maateline ulkoyksikölle",
        description: "Teline maahan kiinnitettynä, kun seinäkiinnitys ei sovellu.",
        unit: "fixed",
        amount: 89,
        searchHint: "ilmalämpöpumppu maateline hinta",
      },
      {
        id: "vanhan-poisto",
        label: "Vanhan laitteen purku ja poisvienti",
        description: "Vanhan ilmalämpöpumpun purku ja jätehuolto.",
        unit: "fixed",
        amount: 150,
        searchHint: "vanhan ilmalämpöpumpun poisto hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko ilmalämpöpumppu maksaa asennettuna?",
        a: "Laite ja perusasennus yhdessä maksavat Suomessa tyypillisesti 1 700–3 500 €. Perusasennus alone on noin 690–950 € ja sisältää noin 4 m putkituksen.",
      },
      {
        q: "Mitä perusasennukseen kuuluu?",
        a: "Tyypillisesti 4 m kylmäaineputkia, seinäläpivienti, ulkoyksikön kiinnitys, kondenssiveden ohjaus ja sähköistys läheisestä pistorasiasta.",
      },
      {
        q: "Paljonko lisäputki maksaa?",
        a: "Yli 4 metrin putkiosuus maksaa yleensä 40–59 € per metri suojakotelointeineen.",
      },
    ],
    scopeTitle: "Miten ilmalämpöpumpun hinta muodostuu?",
    scopeParagraphs: [
      "Suurin osa hinnasta on laitteen hinta. Asennuksen osuus on tyypillisesti noin kolmannes kokonaiskustannuksesta peruskohteessa.",
      "Hinta nousee, jos putkireitti on pitkä, seinärakenne vaatii timanttiporausta, tarvitaan uusi sähkösyöttö taululta tai ulkoyksikkö asennetaan korkealle.",
      "Kotitalousvähennys (35 % työn osuudesta, 2026) alentaa lopullista kustannusta — laskurin summa on ennen vähennystä.",
    ],
    priceRangeNote: "Laite + asennus yhteensä tyypillisesti 1 700–3 500 € (2025–2026).",
    ctaLabel: "Kilpailuta ilmalämpöpumppu ilmaiseksi",
  }),

  buildCalculator({
    slug: "ilmavesilampopumppu",
    title: "Vesi-ilmälämpöpumpun hintalaskuri",
    pageTitle: "Vesi-ilmälämpöpumppu laskuri — laite ja asennus",
    metaDescription:
      "Arvioi vesi-ilmälämpöpumpun hinta: laite, asennus, patteriverkon liitos ja lisätyöt.",
    intro:
      "Vesi-ilmälämpöpumppu liitetään patteriverkkoon tai lattialämmitykseen. Asennus on vaativampi kuin ilmalämpöpumpulla.",
    areaSlug: "lammitys",
    primaryInput: countInput("Asennusten määrä", 1, "kpl"),
    secondaryInput: meterInput("Putkireitin pituus (m)", 8, { max: 40 }),
    lines: [
      {
        id: "laite",
        label: "Vesi-ilmälämpöpumppu (laite)",
        description: "Sisä- ja ulkoyksikkö patteriverkkoon liitettäväksi.",
        unit: "fixed",
        amount: 4500,
        searchHint: "vesi ilma lämpöpumppu hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja käyttöönotto",
        description: "Putkistot, läpiviennit, sähköistys ja käyttöönotto.",
        unit: "fixed",
        amount: 2500,
        searchHint: "vesi ilma lämpöpumppu asennus hinta",
      },
      {
        id: "patteri-liitos",
        label: "Liitos patteriverkkoon",
        description: "LVI-työt lämmönjaon liittämiseksi talon patteriverkkoon.",
        unit: "fixed",
        amount: 1500,
        searchHint: "lämpöpumppu patteriverkko liitos hinta",
      },
      {
        id: "lisaputki",
        label: "Lisäputkisto",
        description: "Kylmäaine- ja lämmönjakoputkien lisämetrit.",
        unit: "per_secondary",
        amount: 80,
        searchHint: "lämpöpumppu putkisto hinta metri",
      },
      {
        id: "sahko",
        label: "Sähkötyöt",
        description: "Erillinen syöttö tai keskuksen päivitys tarvittaessa.",
        unit: "fixed",
        amount: 800,
        searchHint: "lämpöpumppu sähköasennus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko vesi-ilmälämpöpumppu maksaa?",
        a: "Kokonaishinta on tyypillisesti 8 000–15 000 € riippuen laitteesta, patteriverkon kunnosta ja asennuksen vaativuudesta.",
      },
      {
        q: "Sopiiko öljylämmityksen tilalle?",
        a: "Kyllä — vesi-ilmälämpöpumppu on yleisin valinta, kun halutaan hyödyntää olemassa olevaa patteriverkkoa.",
      },
    ],
    scopeTitle: "Vesi-ilmälämpöpumpun kustannukset",
    scopeParagraphs: [
      "Laite on kalliimpi kuin ilmalämpöpumpulla, mutta hyötysuhde patterilämmityksessä on parempi.",
      "Patteriverkon kunnon arviointi vaikuttaa merkittävästi — vanha verkko saattaa vaatia osittaisen uusimisen.",
    ],
    priceRangeNote: "Tyypillisesti 8 000–15 000 € kokonaisuutena.",
    ctaLabel: "Kilpailuta vesi-ilmälämpöpumppu",
  }),

  buildCalculator({
    slug: "maalampopumppu",
    title: "Maalämpöpumpun hintalaskuri",
    pageTitle: "Maalämpöpumppu laskuri — laite, kaivo ja asennus",
    metaDescription:
      "Arvioi maalämpöpumpun hinta: laite, maalämpökaivo, asennus ja sähkötyöt.",
    intro:
      "Maalämpöpumppu vaatii maahan kaivettavan keruupiirin. Investointi on suurempi, mutta käyttökustannukset pienemmät.",
    areaSlug: "lammitys",
    primaryInput: sqmInput("Lämmitettävä pinta-ala", 120, { max: 400 }),
    lines: [
      {
        id: "laite",
        label: "Maalämpöpumppuyksikkö",
        description: "Lämpöpumppu ja maalämmön liitos tekniikkahuoneessa.",
        unit: "fixed",
        amount: 8000,
        searchHint: "maalämpöpumppu hinta",
      },
      {
        id: "kaivo",
        label: "Maalämpökaivo / keruupiiri",
        description: "Poraus ja keruuputket maahan (hinta riippuu syvyydestä ja maaperästä).",
        unit: "fixed",
        amount: 12000,
        searchHint: "maalämpökaivo hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja käyttöönotto",
        description: "Putkistot, sähköistys, patteriverkon liitos ja käyttöönotto.",
        unit: "fixed",
        amount: 4000,
        searchHint: "maalämpöpumppu asennus hinta",
      },
      {
        id: "sahko",
        label: "Sähkökeskuksen päivitys",
        description: "Uusi syöttö tai keskuksen vahvistus tarvittaessa.",
        unit: "fixed",
        amount: 1500,
        searchHint: "maalämpöpumppu sähkö hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko maalämpö maksaa?",
        a: "Omakotitalossa kokonaisuus on tyypillisesti 20 000–35 000 € riippuen kaivon syvyydestä, maaperästä ja talon koosta.",
      },
    ],
    scopeTitle: "Maalämpöpumpun investointi",
    scopeParagraphs: [
      "Suurin kustannuserä on maalämpökaivo. Kalliimpaa kalliossa, edullisempaa hiekassa.",
      "Maalämpö sopii parhaiten öljyn tai suoran sähkön korvaamiseen pitkäaikaisessa asumisessa.",
    ],
    priceRangeNote: "Tyypillisesti 20 000–35 000 €.",
    ctaLabel: "Kilpailuta maalämpö",
  }),

  buildCalculator({
    slug: "lammitys-vaihto",
    title: "Lämmitysjärjestelmän vaihdon hintalaskuri",
    pageTitle: "Lämmityksen vaihto laskuri — arvioi kokonaiskustannus",
    metaDescription:
      "Arvioi lämmitysjärjestelmän vaihdon hinta: vanhan purku, uusi laite, asennus ja patteriverkko.",
    intro:
      "Kun vaihdat esimerkiksi öljystä lämpöpumppuun, hintaan vaikuttavat vanhan järjestelmän purku, uusi laite ja patteriverkon kunto.",
    areaSlug: "lammitys",
    primaryInput: sqmInput("Lämmitettävä pinta-ala", 120, { max: 400 }),
    lines: [
      {
        id: "purku",
        label: "Vanhan lämmityksen purku",
        description: "Öljysäiliön tyhjennys, poisto ja jätehuolto tai vanhan kattilan purku.",
        unit: "fixed",
        amount: 2000,
        searchHint: "öljylämmityksen poisto hinta",
      },
      {
        id: "laite",
        label: "Uusi lämmitysjärjestelmä (laite)",
        description: "Lämpöpumppu, kattila tai muu uusi lämmön lähde.",
        unit: "fixed",
        amount: 6000,
        searchHint: "lämpöpumppu hinta asennettuna",
      },
      {
        id: "asennus",
        label: "Asennus ja käyttöönotto",
        description: "LVI- ja sähkötyöt, käyttöönotto ja säätö.",
        unit: "fixed",
        amount: 3500,
        searchHint: "lämmitysjärjestelmän vaihto hinta",
      },
      {
        id: "patterit",
        label: "Patteriverkon päivitys",
        description: "Patterien vaihto tai verkoston osittainen uusinta tarvittaessa.",
        unit: "per_primary",
        amount: 15,
        searchHint: "patteriverkon uusinta hinta neliö",
      },
      {
        id: "lattialammitys",
        label: "Lattialämmityksen lisäys",
        description: "Sähkö- tai vesikiertoinen lattialämmitys osaan taloa.",
        unit: "per_primary",
        amount: 80,
        searchHint: "lattialämmitys hinta neliö",
      },
    ],
    faq: [
      {
        q: "Paljonko maksaa vaihtaa öljystä lämpöpumppuun?",
        a: "Kokonaisuus on usein 12 000–25 000 € riippuen valitusta järjestelmästä ja talon koosta.",
      },
    ],
    scopeTitle: "Lämmityksen vaihdon kustannukset",
    scopeParagraphs: [
      "Vanhan öljylämmityksen poisto ja säiliön käsittely lisäävät kustannuksia merkittävästi.",
      "Patteriverkon kunto vaikuttaa — vanha verkko saattaa vaatia uusimista lämpöpumpun kanssa.",
    ],
    priceRangeNote: "Tyypillisesti 12 000–25 000 €.",
    ctaLabel: "Kilpailuta lämmityksen vaihto",
  }),
];
