import { buildCalculator, countInput, sqmInput } from "../helpers";
import type { CalculatorConfig } from "../types";

export const SAHKO_CALCULATORS: CalculatorConfig[] = [
  buildCalculator({
    slug: "latauspiste",
    title: "Sähköauton latauspisteen hintalaskuri",
    pageTitle: "Latauspiste laskuri — asennus ja laite",
    metaDescription: "Arvioi sähköauton latauspisteen hinta: laite, asennus ja kaapelointi.",
    intro: "Kotilatauspiste vaatii riittävän sähkösyötön ja asennuksen. Hintaan vaikuttavat etäisyys keskukselle ja maakaapelointi.",
    areaSlug: "sahko-energia",
    primaryInput: countInput("Latauspisteitä", 1, "kpl"),
    secondaryInput: {
      label: "Kaapelointi (m)",
      unit: "m",
      defaultValue: 10,
      min: 0,
      max: 50,
      step: 1,
      hint: "Etäisyys sähkökeskuksesta latauspisteeseen.",
    },
    lines: [
      {
        id: "laite",
        label: "Latauslaite (11 kW)",
        description: "Type 2 -latauspiste kiinteään asennukseen.",
        unit: "fixed",
        amount: 800,
        searchHint: "sähköauto latauspiste hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja käyttöönotto",
        description: "Kiinnitys, kytkentä ja testaus.",
        unit: "fixed",
        amount: 600,
        searchHint: "latauspisteen asennus hinta",
      },
      {
        id: "kaapeli",
        label: "Kaapelointi",
        description: "Sähkökaapeli keskukselta latauspisteelle.",
        unit: "per_secondary",
        amount: 25,
        searchHint: "latauspiste kaapelointi hinta metri",
      },
      {
        id: "keskus",
        label: "Sähkökeskuksen päivitys",
        description: "Uusi sulake tai keskuksen vahvistus tarvittaessa.",
        unit: "fixed",
        amount: 500,
        searchHint: "sähkökeskuksen päivitys hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko latauspiste maksaa?",
        a: "Laite ja asennus yhteensä tyypillisesti 1 200–2 500 € riippuen kaapeloinnista.",
      },
    ],
    scopeTitle: "Latauspisteen kustannukset",
    scopeParagraphs: [
      "11 kW lataus vaatii usein 3-vaiheisen syötön. Etäisyys keskukselle nostaa hintaa.",
    ],
    ctaLabel: "Kilpailuta latauspiste",
  }),

  buildCalculator({
    slug: "aurinkopaneelit",
    title: "Aurinkopaneelien hintalaskuri",
    pageTitle: "Aurinkopaneelit laskuri — järjestelmän hinta",
    metaDescription: "Arvioi aurinkopaneelien hinta: paneelit, invertteri, asennus ja sähkötyöt.",
    intro: "Aurinkosähköjärjestelmän hinta riippuu paneelien määrästä, kattotyypistä ja invertteristä.",
    areaSlug: "sahko-energia",
    primaryInput: countInput("Paneelien määrä", 12, "kpl", { max: 40 }),
    lines: [
      {
        id: "paneelit",
        label: "Aurinkopaneelit",
        description: "Monikidepaneelit (noin 400–450 W / kpl).",
        unit: "per_primary",
        amount: 180,
        searchHint: "aurinkopaneeli hinta kpl",
      },
      {
        id: "invertteri",
        label: "Invertteri / optimoijat",
        description: "Vaihtosuuntaaja tai mikroinvertterit.",
        unit: "fixed",
        amount: 1500,
        searchHint: "aurinkopaneeli invertteri hinta",
      },
      {
        id: "asennus",
        label: "Asennus katolle",
        description: "Kiinnikkeet, asennustyö ja turvavarusteet.",
        unit: "per_primary",
        amount: 120,
        searchHint: "aurinkopaneelien asennus hinta",
      },
      {
        id: "sahko",
        label: "Sähkötyöt ja käyttöönotto",
        description: "Kytkentä keskukselle, mittaus ja ilmoitukset.",
        unit: "fixed",
        amount: 800,
        searchHint: "aurinkosähkö sähkötyöt hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko aurinkopaneelit maksavat?",
        a: "5 kW järjestelmä maksaa tyypillisesti 6 000–10 000 € asennettuna.",
      },
    ],
    scopeTitle: "Aurinkosähkön investointi",
    scopeParagraphs: [
      "Kattotyppi vaikuttaa asennuksen hintaan — harjakatto on yleensä edullisin.",
      "Kotitalousvähennys koskee työn osuutta.",
    ],
    ctaLabel: "Kilpailuta aurinkopaneelit",
  }),

  buildCalculator({
    slug: "sahkokeskus",
    title: "Sähkökeskuksen uusinnan hintalaskuri",
    pageTitle: "Sähkökeskus laskuri — uusinta ja asennus",
    metaDescription: "Arvioi sähkökeskuksen uusinnan hinta.",
    intro: "Vanha keskuksen uusinta parantaa turvallisuutta ja mahdollistaa lisäkuormia (lataus, lämpöpumppu).",
    areaSlug: "sahko-energia",
    primaryInput: countInput("Keskuksia", 1, "kpl"),
    lines: [
      {
        id: "keskus",
        label: "Sähkökeskus (laite)",
        description: "Uusi pääkeskus riittävällä kapasiteetilla.",
        unit: "fixed",
        amount: 800,
        searchHint: "sähkökeskus hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja kytkentä",
        description: "Vanhan purku, uuden asennus ja kaikkien piirien kytkentä.",
        unit: "fixed",
        amount: 1500,
        searchHint: "sähkökeskuksen uusinta hinta",
      },
      {
        id: "maadoitus",
        label: "Maadoitus ja mittaukset",
        description: "Maadoituksen tarkistus ja sähköturvallisuusmittaukset.",
        unit: "fixed",
        amount: 300,
        searchHint: "sähkökeskus maadoitus hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko sähkökeskuksen uusinta maksaa?",
        a: "Tyypillisesti 2 000–4 000 € riippuen piirin määrästä.",
      },
    ],
    scopeTitle: "Sähkökeskuksen uusinta",
    scopeParagraphs: [
      "Vanhoissa taloissa keskuksen uusinta on usein pakollinen ennen suuria lisäkuormia.",
    ],
    ctaLabel: "Kilpailuta sähkökeskus",
  }),

  buildCalculator({
    slug: "sahko-lisays",
    title: "Sähköpisteiden lisäyksen hintalaskuri",
    pageTitle: "Sähköpisteet laskuri — uudet pistorasiat",
    metaDescription: "Arvioi uusien sähköpisteiden hinta.",
    intro: "Uudet pistorasiat, kytkimet ja valaistuspisteet — hinta riippuu määrästä ja kaapeloinnista.",
    areaSlug: "sahko-energia",
    primaryInput: countInput("Uusia pisteitä", 5, "kpl", { max: 30 }),
    lines: [
      {
        id: "pisteet",
        label: "Pistorasiat / kytkimet",
        description: "Materiaalit ja asennus per piste.",
        unit: "per_primary",
        amount: 120,
        minAmount: 300,
        searchHint: "pistorasian asennus hinta",
      },
      {
        id: "kaapeli",
        label: "Kaapelointi",
        description: "Johdotus keskukselta tai haarautus olemassa olevasta.",
        unit: "per_primary",
        amount: 40,
        searchHint: "sähkökaapelointi hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko uusi pistorasia maksaa?",
        a: "Yksittäinen piste maksaa usein 100–200 €. Useampi piste alentaa keskihintaa.",
      },
    ],
    scopeTitle: "Sähköpisteiden lisäys",
    scopeParagraphs: [
      "Pintavetoinen kaapelointi on edullisempaa kuin upotettu betoniseinään.",
    ],
    ctaLabel: "Kilpailuta sähkötyöt",
  }),

  buildCalculator({
    slug: "ulko-valaistus",
    title: "Ulkovalaistuksen hintalaskuri",
    pageTitle: "Ulkovalaistus laskuri — asennus ja valaisimet",
    metaDescription: "Arvioi ulkovalaistuksen hinta: valaisimet, kaapelointi ja asennus.",
    intro: "Pihan, polun ja seinän valaistus — hinta riippuu valaisimien määrästä ja kaapeloinnista.",
    areaSlug: "sahko-energia",
    primaryInput: countInput("Valaisimia", 4, "kpl", { max: 20 }),
    lines: [
      {
        id: "valaisimet",
        label: "Valaisimet",
        description: "LED-valaisimet ulkokäyttöön.",
        unit: "per_primary",
        amount: 80,
        searchHint: "ulkovalaisin hinta",
      },
      {
        id: "asennus",
        label: "Asennus ja kaapelointi",
        description: "Maanalaiset kaapelit tai pintaveto, kytkentä.",
        unit: "per_primary",
        amount: 150,
        searchHint: "ulkovalaistus asennus hinta",
      },
      {
        id: "ohjaus",
        label: "Anturi / ajastin",
        description: "Liikeanturi, hämäräkytkin tai älyohjaus.",
        unit: "fixed",
        amount: 200,
        searchHint: "ulkovalaistus anturi hinta",
      },
    ],
    faq: [
      {
        q: "Paljonko ulkovalaistus maksaa?",
        a: "4 valaisimen kokonaisuus on tyypillisesti 800–1 500 €.",
      },
    ],
    scopeTitle: "Ulkovalaistuksen kustannukset",
    scopeParagraphs: [
      "Maanalainen kaapelointi on työläämpää mutta siistimpi ratkaisu.",
    ],
    ctaLabel: "Kilpailuta ulkovalaistus",
  }),
];
