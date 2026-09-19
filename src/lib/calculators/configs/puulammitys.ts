import { buildCalculator, countInput, meterInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const PUULAMMITYS_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "takka-kamiina",
    title: "Takan / kamiinan hintalaskuri",
    pageTitle: "Takka tai kamiina laskuri — laite ja asennus",
    metaDescription:
      "Arvioi takan tai kamiinan hinta: laite, hormi, perustus ja asennustyöt.",
    intro:
      "Tulisijan hinta muodostuu laitteesta, hormityöstä, perustuksesta ja mahdollisista rakennemuutoksista.",
    areaSlug: "puulammitys",
    primaryInput: countInput("Tulisijoja", 1, "kpl"),
    lines: [
      {
        id: "laite",
        label: "Takka / kamiina (laite)",
        description: "Tulisija valmistajalta — hinta riippuu tyypistä ja tehosta.",
        unit: "fixed",
        amount: 2500,
        searchHint: "takka kamiina hinta",
      },
      {
        id: "hormi",
        label: "Hormi ja savukanava",
        description: "Uusi hormi tai olemassa olevan hyödyntäminen, savupellit ja eristeet.",
        unit: "fixed",
        amount: 2000,
        searchHint: "takan hormi hinta",
      },
      {
        id: "asennus",
        label: "Asennustyöt",
        description: "Tulisijan asennus, tiivistykset ja käyttöönotto.",
        unit: "fixed",
        amount: 1500,
        searchHint: "takan asennus hinta",
      },
      {
        id: "perustus",
        label: "Perustus ja suojalattia",
        description: "Kantava alusta tulisijalle ja suojamatto.",
        unit: "fixed",
        amount: 800,
        searchHint: "takan perustus hinta",
      },
      {
        id: "rakenne",
        label: "Rakennemuutokset",
        description: "Aukko seinään, suojaus ja viimeistely.",
        unit: "fixed",
        amount: 1200,
        searchHint: "takan rakentaminen hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko takka maksaa asennettuna?",
        a: "Kokonaisuus on tyypillisesti 5 000–12 000 € riippuen laitteesta, hormista ja rakennemuutoksista.",
      },
    ],
    scopeTitle: "Takan kustannukset",
    scopeParagraphs: [
      "Hormityö on usein merkittävä kustannuserä — olemassa olevan hormin kunto vaikuttaa.",
      "Paloturvallisuusmääräykset edellyttävät riittäviä suojaetäisyyksiä palavaan materiaaliin.",
    ],
    ctaLabel: "Kilpailuta takka tai kamiina",
  }),

  buildCalculator({
    slug: "puukattila",
    title: "Puukattilan hintalaskuri",
    pageTitle: "Puukattila laskuri — laite ja asennus",
    metaDescription:
      "Arvioi puukattilan hinta: kattila, asennus, patteriverkko ja savuhormi.",
    intro: "Puukattila korvaa öljy- tai sähkölämmityksen. Hintaan vaikuttavat kattilan teho ja patteriverkon kunto.",
    areaSlug: "puulammitys",
    primaryInput: sqmInput("Lämmitettävä pinta-ala", 120, { min: 40, max: 400, step: 10 }),
    lines: [
      {
        id: "kattila",
        label: "Puukattila (laite)",
        description: "Kattila ja polttopuu-/pelletitoiminnot.",
        unit: "fixed",
        amount: 4000,
        searchHint: "puukattila hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja käyttöönotto",
        description: "LVI-liitos, sähköistys ja käyttöönotto.",
        unit: "fixed",
        amount: 2500,
        searchHint: "puukattilan asennus hinta",
      },
      {
        id: "hormi",
        label: "Savuhormi",
        description: "Hormi ja savukanavan rakentaminen tai uusinta.",
        unit: "fixed",
        amount: 3000,
        searchHint: "puukattilan hormi hinta",
      },
      {
        id: "patterit",
        label: "Patteriverkon päivitys",
        description: "Verkoston säätö tai osittainen uusinta.",
        unit: "fixed",
        amount: 2000,
        searchHint: "patteriverkon uusinta hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko puukattila maksaa?",
        a: "Kokonaisuus on tyypillisesti 10 000–18 000 € riippuen kattilasta ja hormityöstä.",
      },
    ],
    scopeTitle: "Puukattilan investointi",
    scopeParagraphs: [
      "Puukattila vaatii riittävän polttotilan ja savuhormin. Patteriverkon kunto vaikuttaa lämmönjakoon.",
    ],
    ctaLabel: "Kilpailuta puukattila",
  }),

  buildCalculator({
    slug: "hormi",
    title: "Hormin uusinnan hintalaskuri",
    pageTitle: "Hormi laskuri — uusinta tai korjaus",
    metaDescription: "Arvioi hormin uusinnan tai korjauksen hinta.",
    intro: "Hormin kunto vaikuttaa tulisijan turvallisuuteen. Uusinta tai pinnoitus riippuu hormin tyypistä ja korkeudesta.",
    areaSlug: "puulammitys",
    primaryInput: meterInput("Hormin korkeus", 8, { min: 3, max: 20 }),
    lines: [
      {
        id: "nuohous",
        label: "Nuohous ja tarkastus",
        description: "Ammattimainen nuohous ja kuntoarvio.",
        unit: "fixed",
        amount: 150,
        minAmount: 150,
        searchHint: "hormin nuohous hinta",
      },
      {
        id: "pinnoitus",
        label: "Hormin pinnoitus / uusinta",
        description: "Pinnoitus tai osittainen uusinta metrihintaan perustuen.",
        unit: "per_primary",
        amount: 200,
        searchHint: "hormin uusinta hinta",
      },
      {
        id: "pelti",
        label: "Hormipellit ja kattoläpiviennit",
        description: "Pellit, tiivistykset ja sääsuojat.",
        unit: "fixed",
        amount: 400,
        searchHint: "hormipelti hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko hormin uusinta maksaa?",
        a: "Pinnoitus maksaa usein 1 500–4 000 €. Täysi uusinta voi olla 5 000–10 000 €.",
      },
    ],
    scopeTitle: "Hormityön kustannukset",
    scopeParagraphs: [
      "Nuohous kannattaa teettää säännöllisesti — se pidentää hormin käyttöikää.",
      "Vanha tiilihormi saattaa vaatia pinnoituksen ennen uuden tulisijan asennusta.",
    ],
    ctaLabel: "Kilpailuta hormityö",
  }),

  buildCalculator({
    slug: "puulammitys-varaaja",
    title: "Lämmönvaraajan hintalaskuri",
    pageTitle: "Lämmönvaraaja laskuri — laite ja asennus",
    metaDescription: "Arvioi lämmönvaraajan hinta puulämmitykseen.",
    intro: "Varaaja kerää lämpöä puukattilasta ja jakaa sen patteriverkkoon pidempään.",
    areaSlug: "puulammitys",
    primaryInput: countInput("Varaajia", 1, "kpl"),
    lines: [
      {
        id: "varaaja",
        label: "Lämmönvaraaja (laite)",
        description: "Eristetty varaajasäiliö sopivalla tilavuudella.",
        unit: "fixed",
        amount: 2000,
        searchHint: "lämmönvaraaja hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja liitos",
        description: "LVI-liitos kattilaan ja patteriverkkoon.",
        unit: "fixed",
        amount: 1200,
        searchHint: "lämmönvaraajan asennus hinta",
      },
      {
        id: "eristys",
        label: "Eristys ja putkistot",
        description: "Lämpöeristetyt putket ja tarvikkeet.",
        unit: "fixed",
        amount: 500,
        searchHint: "lämmönvaraaja putkisto hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko lämmönvaraaja maksaa?",
        a: "Laite ja asennus yhteensä tyypillisesti 3 000–5 000 €.",
      },
    ],
    scopeTitle: "Lämmönvaraajan kustannukset",
    scopeParagraphs: [
      "Varaaja tasaa lämpöä ja pidentää lämmityskertojen välejä.",
    ],
    ctaLabel: "Kilpailuta lämmönvaraaja",
  }),
];
