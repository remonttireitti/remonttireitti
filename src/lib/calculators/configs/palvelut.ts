import { buildCalculator, countInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const PALVELUT_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "siivous-koti",
    jobSlug: "siivous-koti",
    title: "Kotisiivouksen hintalaskuri",
    pageTitle: "Kotisiivous laskuri — arvioi siivouksen hinta",
    metaDescription: "Arvioi kotisiivouksen hinta kuukausittain tai kertaluonteisesti.",
    intro: "Kotisiivouksen hinta riippuu asunnon koosta, tahti ja siivouksen laajuudesta.",
    areaSlug: "palvelut",
    primaryInput: sqmInput("Asunnon pinta-ala", 80, { min: 20, max: 250 }),
    secondaryInput: countInput("Siivouksia kuukaudessa", 4, "krt", { max: 12 }),
    lines: [
      {
        id: "siivous",
        label: "Siivouskäynti",
        description: "Perussiivous (pölyt, lattiat, keittiö, wc).",
        unit: "per_primary",
        amount: 1.2,
        minAmount: 80,
        searchHint: "kotisiivous hinta neliö",
      },
    ],
    faq: [
      {
        q: "Paljonko kotisiivous maksaa?",
        a: "80 m² asunnossa noin 100–150 € / käynti. Kuukausittain 400–600 €.",
      },
    ],
    scopeTitle: "Kotisiivouksen kustannukset",
    scopeParagraphs: [
      "Ensimmäinen käynti voi olla kalliimpi perussiivouksen vuoksi.",
    ],
    ctaLabel: "Pyydä siivous tarjous",
  }),

  buildCalculator({
    slug: "siivous-loppu",
    title: "Remonttisiivouksen hintalaskuri",
    pageTitle: "Remonttisiivous laskuri",
    metaDescription: "Arvioi remontin jälkeisen siivouksen hinta.",
    intro: "Remonttisiivous poistaa rakennusjätteen ja hienojakoisen pölyn.",
    areaSlug: "palvelut",
    primaryInput: sqmInput("Siivottava pinta-ala", 80, { min: 20, max: 300 }),
    lines: [
      {
        id: "siivous",
        label: "Remonttisiivous",
        description: "Rakennusjätteen poisto, imurointi ja pintojen pesu.",
        unit: "per_primary",
        amount: 4,
        minAmount: 300,
        searchHint: "remonttisiivous hinta neliö",
      },
      {
        id: "ikkunat",
        label: "Ikkunanpesu",
        description: "Ikkunoiden pesu remontin jälkeen.",
        unit: "fixed",
        amount: 150,
        searchHint: "ikkunanpesu hinta remontti",
      },
    ],
    faq: [
      {
        q: "Paljonko remonttisiivous maksaa?",
        a: "Tyypillisesti 300–800 € riippuen remontin laajuudesta.",
      },
    ],
    scopeTitle: "Remonttisiivouksen kustannukset",
    scopeParagraphs: [
      "Hienojakoista rakennuspölyä vaatii ammattilaitteet.",
    ],
    ctaLabel: "Pyydä remonttisiivous tarjous",
  }),

  buildCalculator({
    slug: "muutto",
    title: "Muuttopalvelun hintalaskuri",
    pageTitle: "Muutto laskuri — arvioi muuton hinta",
    metaDescription: "Arvioi muuttopalvelun hinta.",
    intro: "Muuton hinta riippuu kalustemäärästä, kerroksista ja etäisyydestä.",
    areaSlug: "palvelut",
    primaryInput: countInput("Huonekalukuormaa (n. huoneistokoko)", 3, "yks", { max: 10 }),
    lines: [
      {
        id: "muutto",
        label: "Muuttopalvelu",
        description: "Pakkaus, kuljetus ja purku per kuorma.",
        unit: "per_primary",
        amount: 350,
        minAmount: 400,
        searchHint: "muuttopalvelu hinta",
      },
      {
        id: "pakkaus",
        label: "Pakkausmateriaalit",
        description: "Laatikot, suojat ja teippi.",
        unit: "fixed",
        amount: 100,
        searchHint: "muuttopakkaus hinta",
      },
      {
        id: "kerros",
        label: "Kerroslisä (ei hissiä)",
        description: "Portaiden kantaminen.",
        unit: "fixed",
        amount: 150,
        searchHint: "muutto kerroslisä hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko muutto maksaa?",
        a: "Yksi huoneistokuorma tyypillisesti 400–800 € paikallisesti.",
      },
    ],
    scopeTitle: "Muuttopalvelun kustannukset",
    scopeParagraphs: [
      "Pitkät etäisyydet nostavat hintaa merkittävästi.",
    ],
    ctaLabel: "Pyydä muuttotarjous",
  }),

  buildCalculator({
    slug: "kuljetus",
    title: "Kuljetuspalvelun hintalaskuri",
    pageTitle: "Kuljetus laskuri — arvioi kuljetuksen hinta",
    metaDescription: "Arvioi tavarakuljetuksen hinta.",
    intro: "Yksittäisen tavaran tai huonekalun kuljetus.",
    areaSlug: "palvelut",
    primaryInput: countInput("Kuljetettavia kpl", 1, "kpl", { max: 20 }),
    lines: [
      {
        id: "kuljetus",
        label: "Kuljetus",
        description: "Nouto, kuljetus ja toimitus.",
        unit: "per_primary",
        amount: 80,
        minAmount: 80,
        searchHint: "kuljetus hinta",
      },
      {
        id: "kantaminen",
        label: "Kantaminen / nosturi",
        description: "Raskaiden tavaroiden kantaminen tai nosturi.",
        unit: "fixed",
        amount: 100,
        searchHint: "huonekalukuljetus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko kuljetus maksaa?",
        a: "Paikallinen kuljetus 80–200 €. Isommat kalusteet 150–400 €.",
      },
    ],
    scopeTitle: "Kuljetuksen kustannukset",
    scopeParagraphs: [
      "Etäisyys ja kerrokset vaikuttavat hintaan.",
    ],
    ctaLabel: "Pyydä kuljetustarjous",
  }),

  buildCalculator({
    slug: "ikkunanpesu",
    title: "Ikkunanpesun hintalaskuri",
    pageTitle: "Ikkunanpesu laskuri",
    metaDescription: "Arvioi ikkunanpesun hinta.",
    intro: "Ikkunanpesu kerran vuodessa tai säännöllisemmin.",
    areaSlug: "palvelut",
    primaryInput: countInput("Ikkunoita", 12, "kpl", { max: 40 }),
    lines: [
      {
        id: "pesu",
        label: "Ikkunanpesu",
        description: "Sisä- ja ulkopuolen pesu (tai vain ulko).",
        unit: "per_primary",
        amount: 8,
        minAmount: 80,
        searchHint: "ikkunanpesu hinta kpl",
      },
    ],
    faq: [
      {
        q: "Paljonko ikkunanpesu maksaa?",
        a: "Noin 5–12 € / ikkuna. Koko talo 80–150 €.",
      },
    ],
    scopeTitle: "Ikkunanpesun kustannukset",
    scopeParagraphs: [
      "Korkeat ikkunat vaativat telineet — hinta nousee.",
    ],
    ctaLabel: "Pyydä ikkunanpesu tarjous",
  }),

  buildCalculator({
    slug: "kattopesu",
    title: "Kattopesun hintalaskuri",
    pageTitle: "Kattopesu laskuri",
    metaDescription: "Arvioi kattopesun hinta.",
    intro: "Sammaleen poisto ja kattopinnoitteen suojaus pidentävät katon ikää.",
    areaSlug: "palvelut",
    primaryInput: sqmInput("Katon pinta-ala", 120, { min: 40, max: 400, step: 10 }),
    lines: [
      {
        id: "pesu",
        label: "Kattopesu ja sammaleen poisto",
        description: "Pesu, sammaleen poisto ja huuhtelu.",
        unit: "per_primary",
        amount: 4,
        minAmount: 400,
        searchHint: "kattopesu hinta neliö",
      },
      {
        id: "suojaus",
        label: "Suojausaine",
        description: "Sammalenestoaine katon pintaan.",
        unit: "per_primary",
        amount: 2,
        searchHint: "kattosuojaus hinta neliö",
      },
    ],
    faq: [
      {
        q: "Paljonko kattopesu maksaa?",
        a: "Tyypillisesti 3–6 €/m² eli 400–800 € omakotitalossa.",
      },
    ],
    scopeTitle: "Kattopesun kustannukset",
    scopeParagraphs: [
      "Kattopesu kannattaa tehdä ennen sammalen aiheuttamia vaurioita.",
    ],
    ctaLabel: "Pyydä kattopesu tarjous",
  }),

  buildCalculator({
    slug: "nurmikon-leikkuu",
    title: "Nurmikonleikkuun hintalaskuri",
    pageTitle: "Nurmikonleikkuu laskuri",
    metaDescription: "Arvioi nurmikonleikkuun hinta kausittain.",
    intro: "Säännöllinen nurmikonleikkuu kesäkaudella.",
    areaSlug: "palvelut",
    primaryInput: sqmInput("Nurmikon pinta-ala", 500, { min: 100, max: 5000, step: 50 }),
    secondaryInput: countInput("Leikkuukertoja kaudella", 15, "krt", { max: 30 }),
    lines: [
      {
        id: "leikkuu",
        label: "Nurmikonleikkuu",
        description: "Leikkuu, reunusleikkuu ja jätteen poisto.",
        unit: "per_primary",
        amount: 0.08,
        minAmount: 40,
        searchHint: "nurmikonleikkuu hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko nurmikonleikkuu maksaa?",
        a: "500 m² piha noin 40–60 € / kerta. Kausittain 600–900 €.",
      },
    ],
    scopeTitle: "Nurmikonleikkuun kustannukset",
    scopeParagraphs: [
      "Reunusleikkuu ja trimmeröinti lisäävät hintaa.",
    ],
    ctaLabel: "Pyydä nurmikonleikkuu tarjous",
  }),

  buildCalculator({
    slug: "lumityo",
    title: "Lumenluontipalvelun hintalaskuri",
    pageTitle: "Lumityö laskuri",
    metaDescription: "Arvioi lumenluontipalvelun hinta.",
    intro: "Lumenluonti piha-alueelta, ajoväyliltä ja kulkuteiltä.",
    areaSlug: "palvelut",
    primaryInput: sqmInput("Aurausalue", 200, { min: 50, max: 2000, step: 25 }),
    lines: [
      {
        id: "lumi",
        label: "Lumenluonti",
        description: "Lumen auraus tai lapioiminen.",
        unit: "per_primary",
        amount: 0.5,
        minAmount: 50,
        searchHint: "lumityö hinta",
      },
      {
        id: "hiekoitus",
        label: "Hiekoitus",
        description: "Hiekoitus aurausalueille.",
        unit: "fixed",
        amount: 30,
        searchHint: "hiekoitus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko lumityö maksaa?",
        a: "Piha-alue 50–150 € / käynti riippuen lumimäärästä.",
      },
    ],
    scopeTitle: "Lumityön kustannukset",
    scopeParagraphs: [
      "Kausisopimus on usein edullisempi kuin yksittäiset käynnit.",
    ],
    ctaLabel: "Pyydä lumityö tarjous",
  }),
];
