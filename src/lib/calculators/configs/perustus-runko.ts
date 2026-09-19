import { buildCalculator, meterInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const PERUSTUS_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "sokkeli",
    title: "Sokkeliremontin hintalaskuri",
    pageTitle: "Sokkeli laskuri — arvioi sokkeliremontin hinta",
    metaDescription: "Arvioi sokkelin korjauksen hinta: eriste, vedeneriste ja pinnoitus.",
    intro: "Sokkelin kosteus- ja routaeriste parantaa talon energiatehokkuutta ja estää kosteusvaurioita.",
    areaSlug: "perustus-runko",
    primaryInput: meterInput("Sokkelin pituus", 40, { min: 10, max: 150 }),
    lines: [
      {
        id: "purku",
        label: "Vanhan eristeen purku",
        description: "Vanhan eristeen ja pinnoitteen purku.",
        unit: "per_primary",
        amount: 25,
        searchHint: "sokkelin purku hinta metri",
      },
      {
        id: "eriste",
        label: "Routa- ja kosteuseriste",
        description: "XPS-eriste, vedeneriste ja tuuletus.",
        unit: "per_primary",
        amount: 45,
        searchHint: "sokkelieristys hinta metri",
      },
      {
        id: "pinnoite",
        label: "Pinnoite",
        description: "Laatta, piirustuslaatta tai muu pinnoite.",
        unit: "per_primary",
        amount: 30,
        searchHint: "sokkelipinnoite hinta metri",
      },
      {
        id: "salaoja",
        label: "Salaojitus",
        description: "Salaojaputki ja sadevesien ohjaus.",
        unit: "fixed",
        amount: 2000,
        searchHint: "salaojitus hinta talo",
      },
    ],
    faq: [
      {
        q: "Paljonko sokkeliremontti maksaa?",
        a: "Omakotitalossa tyypillisesti 5 000–15 000 € riippuen laajuudesta.",
      },
    ],
    scopeTitle: "Sokkeliremontin kustannukset",
    scopeParagraphs: [
      "Salaojitus kannattaa tarkistaa samalla — se estää kosteusongelmia.",
    ],
    priceRangeNote: "5 000–15 000 €.",
    ctaLabel: "Kilpailuta sokkeliremontti",
  }),

  buildCalculator({
    slug: "perustus",
    title: "Perustustyön hintalaskuri",
    pageTitle: "Perustus laskuri — arvioi perustustyön hinta",
    metaDescription: "Arvioi perustustyön hinta: maatyöt, perustukset ja eristeet.",
    intro: "Perustustyö riippuu maaperästä, perustustavasta ja rakennuksen koosta.",
    areaSlug: "perustus-runko",
    primaryInput: sqmInput("Rakennuksen pinta-ala", 80, { min: 20, max: 300, step: 5 }),
    lines: [
      {
        id: "maatyot",
        label: "Maatyöt ja kaivuu",
        description: "Maan siirto, kaivuu ja tiivistys.",
        unit: "per_primary",
        amount: 40,
        minAmount: 3000,
        searchHint: "perustus maatyöt hinta neliö",
      },
      {
        id: "perustus",
        label: "Perustusrakenteet",
        description: "Laatta, anturat tai paalut.",
        unit: "per_primary",
        amount: 80,
        searchHint: "perustus hinta neliö",
      },
      {
        id: "eriste",
        label: "Eristeet ja vedeneriste",
        description: "Alapohjan eristeet ja sokkelin vedeneriste.",
        unit: "per_primary",
        amount: 20,
        searchHint: "perustuseriste hinta neliö",
      },
      {
        id: "salaoja",
        label: "Salaojitus ja sadevesi",
        description: "Salaojaputket ja kaivot.",
        unit: "fixed",
        amount: 2500,
        searchHint: "salaojitus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko perustukset maksavat?",
        a: "Omakotitalossa perustukset ja maatyöt 25 000–50 000 € (10–15 % budjetista).",
      },
    ],
    scopeTitle: "Perustustyön kustannukset",
    scopeParagraphs: [
      "Perustustapa valitaan pohjatutkimuksen perusteella — ei hinnan mukaan.",
      "Pehmeä maa vaatii paalutuksen, mikä nostaa kustannuksia merkittävästi.",
    ],
    priceRangeNote: "25 000–50 000 € omakotitalossa.",
    ctaLabel: "Kilpailuta perustustyö",
  }),

  buildCalculator({
    slug: "vaihe-eriste",
    title: "Välipohjan eristuksen hintalaskuri",
    pageTitle: "Välipohja-eriste laskuri",
    metaDescription: "Arvioi ylä- tai välipohjan eristyksen hinta.",
    intro: "Yläpohjan tai välipohjan lisäeriste parantaa energiatehokkuutta.",
    areaSlug: "perustus-runko",
    primaryInput: sqmInput("Eristettävä pinta-ala", 80, { min: 20, max: 300, step: 5 }),
    lines: [
      {
        id: "eriste",
        label: "Eristemateriaali",
        description: "Mineraalivilla, puhallusvilla tai kovalevy.",
        unit: "per_primary",
        amount: 12,
        searchHint: "villaeriste hinta neliö",
      },
      {
        id: "tyo",
        label: "Asennustyö",
        description: "Eristeen asennus ja tuulensuoja.",
        unit: "per_primary",
        amount: 10,
        searchHint: "eristysasennus hinta neliö",
      },
      {
        id: "hoyrynsulku",
        label: "Höyrynsulku",
        description: "Höyrynsulku ja tiivistykset.",
        unit: "per_primary",
        amount: 5,
        searchHint: "höyrynsulku hinta neliö",
      },
    ],
    faq: [
      {
        q: "Paljonko yläpohjan eristys maksaa?",
        a: "Tyypillisesti 15–30 €/m² eli 80 m² talossa 1 500–3 000 €.",
      },
    ],
    scopeTitle: "Eristyksen kustannukset",
    scopeParagraphs: [
      "Puhallusvilla sopii vaikeasti saavutettaviin yläpohjiin.",
    ],
    priceRangeNote: "15–30 €/m².",
    ctaLabel: "Kilpailuta eristys",
  }),
];
