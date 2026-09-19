import { buildCalculator, meterInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const PIHA_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "terassi",
    title: "Terassin hintalaskuri",
    pageTitle: "Terassi laskuri — arvioi terassin hinta",
    metaDescription: "Arvioi terassin hinta: perustukset, runko, lattia ja kaiteet.",
    intro: "Terassin hinta riippuu koosta, materiaalista ja maastosta.",
    areaSlug: "piha",
    primaryInput: sqmInput("Terassin pinta-ala", 20, { min: 6, max: 80 }),
    lines: [
      {
        id: "perustus",
        label: "Perustukset ja paalut",
        description: "Pilarit, paalut tai laattaperustus.",
        unit: "per_primary",
        amount: 35,
        minAmount: 800,
        searchHint: "terassin perustus hinta neliö",
      },
      {
        id: "runko",
        label: "Runko ja koolaus",
        description: "Kantava runko painekyllästetyllä puulla.",
        unit: "per_primary",
        amount: 40,
        searchHint: "terassin runko hinta neliö",
      },
      {
        id: "lattia",
        label: "Terassilauta / komposiitti",
        description: "Lattiamateriaali ja kiinnitys.",
        unit: "per_primary",
        amount: 55,
        searchHint: "terassilauta hinta neliö",
      },
      {
        id: "kaide",
        label: "Kaiteet ja portaat",
        description: "Kaide, portaat ja kaiteet.",
        unit: "fixed",
        amount: 1200,
        searchHint: "terassikaide hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko terassi maksaa?",
        a: "20 m² terassi tyypillisesti 4 000–8 000 €. Media-arvio noin 2 300 € materiaaleista (2025).",
      },
    ],
    scopeTitle: "Terassin kustannukset",
    scopeParagraphs: [
      "Komposiitti on huoltovapaa mutta kalliimpi kuin painekyllästetty puu.",
      "Epätasainen maasto vaatii korkeampia paaluja — hinta nousee.",
    ],
    ctaLabel: "Kilpailuta terassi",
  }),

  buildCalculator({
    slug: "pihatie",
    title: "Piha- ja kulkutien hintalaskuri",
    pageTitle: "Pihatie laskuri — arvioi pihan pinnoituksen hinta",
    metaDescription: "Arvioi piha- ja kulkutien hinta: maatyöt, sorastus ja pinnoite.",
    intro: "Piha- tai kulkutie voidaan pinnoittaa soralla, nupukivellä tai betonilaatoilla.",
    areaSlug: "piha",
    primaryInput: sqmInput("Pinta-ala", 30, { min: 10, max: 200 }),
    lines: [
      {
        id: "maatyot",
        label: "Maatyöt ja tasaus",
        description: "Maan siirto, tasaus ja tiivistys.",
        unit: "per_primary",
        amount: 15,
        minAmount: 400,
        searchHint: "pihatie maatyöt hinta neliö",
      },
      {
        id: "sora",
        label: "Sorakerros ja kantavuus",
        description: "Kantava sorakerros ja geokangas.",
        unit: "per_primary",
        amount: 12,
        searchHint: "pihatie sorastus hinta neliö",
      },
      {
        id: "pinnoite",
        label: "Pinnoite",
        description: "Nupukivi, asfaltti tai betonilaatat.",
        unit: "per_primary",
        amount: 35,
        searchHint: "pihatie pinnoite hinta neliö",
      },
      {
        id: "reunus",
        label: "Reunakiveys",
        description: "Reunakivet ja valut.",
        unit: "fixed",
        amount: 500,
        searchHint: "reunakivi hinta piha",
      },
    ],
    faq: [
      {
        q: "Paljonko pihatie maksaa?",
        a: "Tyypillisesti 50–80 €/m² riippuen pinnoitteesta.",
      },
    ],
    scopeTitle: "Pihatiepinnoituksen kustannukset",
    scopeParagraphs: [
      "Hyvä pohjatyö on kriittinen — huono pohja johtaa painumiin.",
    ],
    ctaLabel: "Kilpailuta pihatie",
  }),

  buildCalculator({
    slug: "aita",
    title: "Aidankorjauksen / uusinnan hintalaskuri",
    pageTitle: "Aita laskuri — arvioi aidan hinta",
    metaDescription: "Arvioi aidan hinta: tolpat, lauta- tai ritiläaita ja asennus.",
    intro: "Aidankorjaus tai uusi aita — hinta riippuu pituudesta, korkeudesta ja materiaalista.",
    areaSlug: "piha",
    primaryInput: meterInput("Aidon pituus", 30, { min: 5, max: 200 }),
    secondaryInput: meterInput("Aidon korkeus", 1.8, { min: 1, max: 2.5, step: 0.1 }),
    lines: [
      {
        id: "tolpat",
        label: "Tolpat ja perustukset",
        description: "Aitatolpat, betonivalut ja kiinnitykset.",
        unit: "per_primary",
        amount: 35,
        searchHint: "aitatolppa hinta metri",
      },
      {
        id: "aita",
        label: "Aitamateriaali",
        description: "Lauta-, pelti- tai ritiläaita.",
        unit: "per_primary",
        amount: 45,
        searchHint: "aita hinta metri",
      },
      {
        id: "portti",
        label: "Portti",
        description: "Käyntiportti tai ajoportti.",
        unit: "fixed",
        amount: 600,
        searchHint: "aitaportti hinta",
      },
      {
        id: "jate",
        label: "Vanhan purku ja jäte",
        description: "Vanhan aidan purku ja jätehuolto.",
        unit: "fixed",
        amount: 400,
        searchHint: "aidan purku hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko aita maksaa?",
        a: "Tyypillisesti 80–150 €/m riippuen materiaalista ja korkeudesta.",
      },
    ],
    scopeTitle: "Aidankorjauksen kustannukset",
    scopeParagraphs: [
      "Kallioinen maasto vaikeuttaa tolppien upotusta.",
    ],
    ctaLabel: "Kilpailuta aita",
  }),

  buildCalculator({
    slug: "piharakennus",
    jobSlug: "terassi",
    title: "Piharakennuksen / aitan hintalaskuri",
    pageTitle: "Piharakennus laskuri — aitta, varasto, pihasauna",
    metaDescription:
      "Arvioi piharakennuksen hinta: perustukset, materiaalit, työt ja jätehuolto.",
    intro:
      "Piharakennus voi olla aitta, varasto tai pihasauna. Alle 30 m² talousrakennus ei yleensä vaadi rakennuslupaa (2025), mutta tarkista kunta.",
    areaSlug: "extra",
    primaryInput: sqmInput("Rakennuksen pinta-ala", 12, { min: 4, max: 30 }),
    lines: [
      {
        id: "perustus",
        label: "Perustukset",
        description:
          "Ruuvipaalut, pilarit tai laattaperustus — tyypillisesti 1 000–7 000 € riippuen tavasta.",
        unit: "per_primary",
        amount: 200,
        minAmount: 1500,
        searchHint: "piharakennuksen perustus hinta",
      },
      {
        id: "materiaalit",
        label: "Rakennusmateriaalit",
        description:
          "Runko, eriste, verhous, katto ja ikkunat — tee-se-itse 5 000–10 000 € materiaaleista.",
        unit: "per_primary",
        amount: 450,
        searchHint: "piharakennus materiaalit hinta neliö",
      },
      {
        id: "tyo",
        label: "Rakennustyöt",
        description: "Rakennus, kattotyöt ja viimeistely ammattilaisella.",
        unit: "per_primary",
        amount: 350,
        searchHint: "piharakennus työ hinta neliö",
      },
      {
        id: "sahko-lvi",
        label: "Sähkö ja LVI",
        description: "Sähköistys, mahdolliset vesipisteet (sauna/keittiö).",
        unit: "fixed",
        amount: 1500,
        searchHint: "piharakennus sähkö hinta",
      },
      {
        id: "jate",
        label: "Jätehuolto ja siivous",
        description: "Rakennusjäte, kuljetus ja työmaan siivous.",
        unit: "fixed",
        amount: 600,
        searchHint: "rakennusjäte hinta",
      },
      {
        id: "nosturi",
        label: "Nosturi / kuljetus",
        description: "Valmisrakennuksen nosturitoimitus tontille.",
        unit: "fixed",
        amount: 800,
        searchHint: "piharakennus nosturi hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko aitta tai piharakennus maksaa?",
        a: "Tee-se-itse 5 000–10 000 €. Valmis hirsiaitta 16 m² noin 16 000–20 000 € materiaaleineen tai asennettuna.",
      },
      {
        q: "Tarvitaanko rakennuslupa?",
        a: "Alle 30 m² talousrakennus ei yleensä vaadi lupaa, mutta kaava ja käyttötarkoitus on tarkistettava.",
      },
    ],
    scopeTitle: "Piharakennuksen kustannukset",
    scopeParagraphs: [
      "Perustukset ovat 15–25 % budjetista — ruuvipaalut ovat edullisin vaihtoehto.",
      "Valmisrakennus on nopeampi mutta kalliimpi kuin tee-se-itse.",
      "Jätehuolto ja kuljetukset unohtuvat usein budjetista.",
    ],
    ctaLabel: "Kilpailuta piharakennus",
  }),
];
