import { buildCalculator, meterInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const LVI_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "ilmanvaihto-kone",
    title: "Ilmanvaihtokoneen hintalaskuri",
    pageTitle: "Ilmanvaihtokone laskuri — laite ja asennus",
    metaDescription: "Arvioi ilmanvaihtokoneen hinta: laite, kanavisto ja asennus.",
    intro: "Koneellinen ilmanvaihto parantaa sisäilmaa. Hintaan vaikuttavat kanaviston laajuus ja talon koko.",
    areaSlug: "lvi-ilma",
    primaryInput: sqmInput("Asunnon pinta-ala", 100, { min: 30, max: 300 }),
    lines: [
      {
        id: "kone",
        label: "Ilmanvaihtokone (laite)",
        description: "Lämmöntalteenotto (LTO) -kone sopivalla teholla.",
        unit: "fixed",
        amount: 2500,
        searchHint: "ilmanvaihtokone hinta",
      },
      {
        id: "kanavisto",
        label: "Kanavisto ja asennus",
        description: "Kanavien veto, eristeet ja ilmanvaihtopisteet.",
        unit: "per_primary",
        amount: 35,
        minAmount: 2000,
        searchHint: "ilmanvaihto kanavisto hinta neliö",
      },
      {
        id: "sahko",
        label: "Sähköistys",
        description: "Kytkentä ja ohjaus.",
        unit: "fixed",
        amount: 400,
        searchHint: "ilmanvaihto sähkö hinta",
      },
      {
        id: "auotus",
        label: "Rakenteen avaus ja korjaus",
        description: "Aukot kanaville ja pintojen korjaus.",
        unit: "fixed",
        amount: 800,
        searchHint: "ilmanvaihto asennus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko ilmanvaihtokone maksaa?",
        a: "Omakotitalossa kokonaisuus on tyypillisesti 5 000–12 000 €.",
      },
    ],
    scopeTitle: "Ilmanvaihdon kustannukset",
    scopeParagraphs: [
      "Vanhaan taloon kanaviston veto on työlästä — hinta nousee merkittävästi.",
      "LTO-kone säästää lämmitysenergiaa talvella.",
    ],
    ctaLabel: "Kilpailuta ilmanvaihto",
  }),

  buildCalculator({
    slug: "ilmanvaihto-puhdistus",
    title: "Ilmanvaihdon puhdistuksen hintalaskuri",
    pageTitle: "Ilmanvaihdon puhdistus laskuri",
    metaDescription: "Arvioi ilmanvaihtokanavien puhdistuksen hinta.",
    intro: "Kanavien puhdistus parantaa ilmanvaihtoa ja vähentää pölyä. Suositellaan noin 5–10 vuoden välein.",
    areaSlug: "lvi-ilma",
    primaryInput: sqmInput("Asunnon pinta-ala", 100, { min: 30, max: 300 }),
    lines: [
      {
        id: "puhdistus",
        label: "Kanavien puhdistus",
        description: "Ammattimainen puhdistus imuroinnilla ja harjauksella.",
        unit: "per_primary",
        amount: 8,
        minAmount: 400,
        searchHint: "ilmanvaihdon puhdistus hinta",
      },
      {
        id: "suodattimet",
        label: "Suodattimien vaihto",
        description: "Uudet suodattimet ilmanvaihtokoneeseen.",
        unit: "fixed",
        amount: 80,
        searchHint: "ilmanvaihto suodatin hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko ilmanvaihdon puhdistus maksaa?",
        a: "Tyypillisesti 400–800 € riippuen asunnon koosta.",
      },
    ],
    scopeTitle: "Ilmanvaihdon puhdistus",
    scopeParagraphs: [
      "Puhdistuksen yhteydessä kannattaa vaihtaa suodattimet.",
    ],
    ctaLabel: "Kilpailuta ilmanvaihdon puhdistus",
  }),

  buildCalculator({
    slug: "kayttovesi",
    title: "Käyttövesiputkiston uusinnan hintalaskuri",
    pageTitle: "Käyttövesi laskuri — putkiston uusinta",
    metaDescription: "Arvioi käyttövesiputkiston uusinnan hinta.",
    intro: "Vanha kupariverkosto tai vuotava putkisto uusitaan. Hintaan vaikuttavat putkien pituus ja pääsy.",
    areaSlug: "lvi-ilma",
    primaryInput: sqmInput("Asunnon pinta-ala", 100, { min: 30, max: 300 }),
    lines: [
      {
        id: "putkisto",
        label: "Putkiston uusinta",
        description: "Kupari- tai muoviputket, liitokset ja eristeet.",
        unit: "per_primary",
        amount: 45,
        minAmount: 2500,
        searchHint: "käyttövesi putkisto uusinta hinta",
      },
      {
        id: "purku",
        label: "Vanhan purku ja jäte",
        description: "Vanhojen putkien purku ja jätehuolto.",
        unit: "fixed",
        amount: 800,
        searchHint: "putkiston purku hinta",
      },
      {
        id: "pinnat",
        label: "Pintojen avaus ja korjaus",
        description: "Seinien ja lattian avaus putkien vaihtoon.",
        unit: "fixed",
        amount: 1500,
        searchHint: "putkiremontti pintojen korjaus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko putkiremontti maksaa?",
        a: "Omakotitalossa tyypillisesti 5 000–15 000 € riippuen laajuudesta.",
      },
    ],
    scopeTitle: "Putkiremontin kustannukset",
    scopeParagraphs: [
      "Linjasaneeraus taloyhtiössä on laajempi projekti kuin yksittäisen huoneen putket.",
    ],
    ctaLabel: "Kilpailuta putkiremontti",
  }),

  buildCalculator({
    slug: "viemari",
    title: "Viemäriremontin hintalaskuri",
    pageTitle: "Viemäri laskuri — korjaus tai uusinta",
    metaDescription: "Arvioi viemäriremontin hinta.",
    intro: "Viemärin tukos, haju tai vuoto — korjaus voi olla paikallinen tai koko putken uusinta.",
    areaSlug: "lvi-ilma",
    primaryInput: meterInput("Viemäriputken pituus", 15, { min: 3, max: 50 }),
    lines: [
      {
        id: "kartoitus",
        label: "Kartoitus / kameraus",
        description: "Viemärin kuvaus ja kunnon arviointi.",
        unit: "fixed",
        amount: 300,
        searchHint: "viemärikameraus hinta",
      },
      {
        id: "korjaus",
        label: "Viemäriputken korjaus / uusinta",
        description: "Sukitus, paikallinen korjaus tai putken uusinta.",
        unit: "per_primary",
        amount: 250,
        minAmount: 800,
        searchHint: "viemäriremontti hinta metri",
      },
      {
        id: "kaivuu",
        label: "Maan kaivuu ja palautus",
        description: "Maanalaisen putken kaivuu ja pihan palautus.",
        unit: "fixed",
        amount: 1500,
        searchHint: "viemäri kaivuu hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko viemäriremontti maksaa?",
        a: "Paikallinen korjaus 800–2 000 €. Maanalaisen putken uusinta 3 000–8 000 €.",
      },
    ],
    scopeTitle: "Viemäriremontin kustannukset",
    scopeParagraphs: [
      "Sukitus on usein edullisempi kuin täysi kaivuu.",
    ],
    ctaLabel: "Kilpailuta viemäriremontti",
  }),

  buildCalculator({
    slug: "vesivahinko",
    title: "Vesivahingon korjauksen hintalaskuri",
    pageTitle: "Vesivahinko laskuri — kuivaus ja korjaus",
    metaDescription: "Arvioi vesivahingon korjauksen hinta: kuivaus, purku ja jälleenrakennus.",
    intro: "Vesivahinko vaatii nopeaa toimintaa. Kustannukset riippuvat vahingon laajuudesta ja rakenteiden kunnosta.",
    areaSlug: "lvi-ilma",
    primaryInput: sqmInput("Vaurioitunut pinta-ala", 10, { min: 2, max: 100 }),
    lines: [
      {
        id: "kuivaus",
        label: "Kuivaus ja mittaus",
        description: "Rakennekuivaus, ilmankuivaimet ja kosteusmittaus.",
        unit: "per_primary",
        amount: 80,
        minAmount: 500,
        searchHint: "vesivahinko kuivaus hinta",
      },
      {
        id: "purku",
        label: "Purku ja jäte",
        description: "Vaurioituneiden materiaalien purku ja jätehuolto.",
        unit: "per_primary",
        amount: 50,
        searchHint: "vesivahinko purku hinta",
      },
      {
        id: "korjaus",
        label: "Jälleenrakennus",
        description: "Uudet pinnat, eristeet ja viimeistely.",
        unit: "per_primary",
        amount: 120,
        searchHint: "vesivahinko korjaus hinta neliö",
      },
      {
        id: "lvi",
        label: "LVI-korjaus",
        description: "Vuotaneen putken korjaus tai uusinta.",
        unit: "fixed",
        amount: 800,
        searchHint: "vesivahinko putkikorjaus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko vesivahinko maksaa?",
        a: "Pieni vahinko 2 000–5 000 €. Laajempi vahinko 10 000–30 000 €.",
      },
    ],
    scopeTitle: "Vesivahingon kustannukset",
    scopeParagraphs: [
      "Vakuutus korvaa usein äkilliset putkenrikot — ilmoita vahingosta heti.",
    ],
    ctaLabel: "Kilpailuta vesivahinkokorjaus",
  }),
];
