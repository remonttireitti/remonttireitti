import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, amt, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const ULKOKUORI_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  "katto-pelti": {
    questions: [
      q("material", "Kattomateriaali", "quick", "pelti", [
        { id: "pelti", label: "Pelti", effect: amt("kate", 45) },
        { id: "tiili", label: "Tiili", effect: amt("kate", 58) },
        { id: "huopa", label: "Huopa", effect: amt("kate", 32) },
      ]),
      q("pitch", "Katon kaltevuus", "quick", "keskitaso", [
        { id: "loiva", label: "Loiva", effect: mult("tyo", 0.95) },
        { id: "keskitaso", label: "Keskitaso", effect: {} },
        { id: "jyrkka", label: "Jyrkkä", effect: mult("tyo", 1.15) },
      ]),
      q("penetrations", "Läpiviennit (kattoluukut, putket)", "quick", "vahan", [
        { id: "vahan", label: "Vähän", effect: {} },
        { id: "kohtalainen", label: "Kohtalainen", effect: add(800) },
        { id: "paljon", label: "Paljon", effect: add(1800) },
      ]),
      q("rannit-uusinta", "Rännit ja kourut", "quick", "uusitaan", [
        { id: "uusitaan", label: "Uusitaan", effect: toggle("rannit", true) },
        { id: "ei-uusita", label: "Ei uusita", effect: toggle("rannit", false) },
      ]),
      q("roof-shape", "Kattomuoto", "detail", "yksinkertainen", [
        { id: "yksinkertainen", label: "Yksinkertainen", effect: {} },
        { id: "monimutkainen", label: "Monimutkainen (lomahuoneet, kulmat)", effect: mult("tyo", 1.1) },
      ]),
      q("underlayment", "Aluskatteen / koolauksen kunto", "detail", "hyva", [
        { id: "hyva", label: "Hyvä", effect: {} },
        { id: "huono", label: "Huono, osittainen uusinta", effect: mult("aluskate", 1.25) },
      ]),
      q("structure", "Ruoteiden / koolauksen korjaukset", "detail", "ei", [
        { id: "ei", label: "Ei tarvita", effect: {} },
        { id: "osittain", label: "Osittaiset korjaukset", effect: add(2500) },
        { id: "laaja", label: "Laajat korjaukset", effect: add(5500) },
      ]),
      q("chimney", "Piipun pellitykset", "detail", "ei", [
        { id: "ei", label: "Ei piippua / ei uusita", effect: {} },
        { id: "kylla", label: "Uusitaan", effect: add(650) },
      ]),
      q("insulation", "Eristeiden uusinta", "detail", "ei", [
        { id: "ei", label: "Ei", effect: {} },
        { id: "osittain", label: "Osittain", effect: add(1500) },
        { id: "koko", label: "Koko katto", effect: add(3500) },
      ]),
      q("access", "Nostotyön vaikeus", "detail", "helppo", [
        { id: "helppo", label: "Helppo pääsy", effect: {} },
        { id: "vaikea", label: "Vaikea (korkea, ahdas)", effect: { lineMultipliers: { tyo: 1.12, purku: 1.08 } } },
      ]),
    ],
    priceFactors: [
      pf("Katon pinta-ala", "included"),
      pf("Materiaalivalinta", "included", ["material"]),
      pf("Purkutyön määrä", "included"),
      pf("Läpiviennit", "variable", ["penetrations"]),
      pf("Katon rakenne ja muoto", "variable", ["roof-shape", "underlayment", "structure"]),
      pf("Mahdolliset korjaukset (eristeet, piiput)", "variable", ["chimney", "insulation"]),
    ],
  },

  ikkunat: {
    questions: [
      q("ikkunatyyppi", "Ikkunatyyppi", "quick", "puu", [
        { id: "puu", label: "Puuikkuna", effect: {} },
        { id: "alumiini", label: "Alumiini-PUU", effect: mult("ikkunat", 1.15) },
        { id: "muovit", label: "Muovit ikkunat", effect: mult("ikkunat", 0.85) },
      ]),
      q("lasi", "Lasitus", "quick", "kaksilasi", [
        { id: "kaksilasi", label: "2-lasi", effect: {} },
        { id: "kolmilasi", label: "3-lasi / energiatehokas", effect: mult("ikkunat", 1.12) },
      ]),
      q("asennus", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (vanha rakenne, korjaus)", effect: mult("asennus", 1.2) },
      ]),
      q("listat", "Sisälistat", "detail", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "laaja", label: "Laajat listat / helmaukset", effect: mult("listat", 1.3) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Ikkunoiden määrä", "included"),
      pf("Ikkunatyyppi ja lasitus", "included", ["ikkunatyyppi", "lasi"]),
      pf("Asennuksen vaativuus", "variable", ["asennus"]),
      pf("Listat ja viimeistely", "variable", ["listat"]),
    ],
  },

  "ovet-ulko": {
    questions: [
      q("ovityyppi", "Oven tyyppi", "quick", "puu", [
        { id: "puu", label: "Puuovi", effect: {} },
        { id: "teras", label: "Teräs / turvaovi", effect: mult("ovi", 1.4) },
        { id: "lasi", label: "Lasiovi", effect: mult("ovi", 1.2) },
      ]),
      q("karmi", "Karmi", "quick", "uusi", [
        { id: "uusi", label: "Uusi karmi", effect: toggle("karmi", true) },
        { id: "vanha", label: "Vanha karmi säilyy", effect: toggle("karmi", false) },
      ]),
      q("lukitus", "Lukitus", "quick", "perus", [
        { id: "perus", label: "Peruslukko", effect: {} },
        { id: "aly", label: "Älylukko / turvalaite", effect: add(350) },
      ]),
      q("asennus", "Asennus", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (vanha aukko)", effect: mult("asennus", 1.25) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Oven tyyppi", "included", ["ovityyppi"]),
      pf("Karmi", "variable", ["karmi"]),
      pf("Lukitus", "variable", ["lukitus"]),
      pf("Asennus", "variable", ["asennus", "extra-work"]),
    ],
  },

  rannit: {
    questions: [
      q("materiaali", "Rännin materiaali", "quick", "alumiini", [
        { id: "alumiini", label: "Alumiini", effect: {} },
        { id: "sinkki", label: "Sinkki / kupari", effect: mult("rannit", 1.2) },
      ]),
      q("sadevesi", "Sadevesijärjestelmä", "quick", "kylla", [
        { id: "kylla", label: "Uusitaan kaivot / putket", effect: toggle("sadevesi", true) },
        { id: "ei", label: "Ei uusita", effect: toggle("sadevesi", false) },
      ]),
      q("korkeus", "Rännien korkeus", "quick", "normaali", [
        { id: "normaali", label: "Normaali (1–2 kerrosta)", effect: {} },
        { id: "korkea", label: "Korkea rakennus", effect: mult("asennus", 1.2) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Rännien pituus", "included"),
      pf("Materiaali", "included", ["materiaali"]),
      pf("Sadevesijärjestelmä", "variable", ["sadevesi"]),
      pf("Asennuksen korkeus", "variable", ["korkeus", "site-access"]),
    ],
  },

  ulkomaalaus: {
    questions: [
      q("pohja", "Pinnan kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä / aiemmin maalattu", effect: {} },
        { id: "rapaus", label: "Rapaus / halkeamia", effect: mult("pesu", 1.3) },
        { id: "home", label: "Home / biohaitta", effect: { lineMultipliers: { pesu: 1.5 }, fixedAdd: 800 } },
      ]),
      q("maali", "Maalin laatu", "quick", "perus", [
        { id: "perus", label: "Perus ulkomaali", effect: {} },
        { id: "laadukas", label: "Laadukas / pitkäikäinen", effect: mult("maali", 1.3) },
      ]),
      q("telinetyo", "Telineet", "quick", "normaali", [
        { id: "normaali", label: "Normaali teline", effect: {} },
        { id: "korkea", label: "Korkea / vaikea", effect: mult("telinetyo", 1.25) },
      ]),
      q("kerrokset", "Maalin kerrokset", "detail", "kaksi", [
        { id: "kaksi", label: "2 kerrosta", effect: {} },
        { id: "kolme", label: "3 kerrosta (tumma pohja)", effect: mult("maalaus", 1.15) },
      ]),
      accessQuestion("maalaus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Maalattava pinta-ala", "included"),
      pf("Pinnan esikäsittely", "variable", ["pohja"]),
      pf("Maalin laatu", "included", ["maali"]),
      pf("Telineet ja korkeus", "variable", ["telinetyo"]),
      pf("Työn vaativuus", "variable", ["kerrokset", "site-access"]),
    ],
  },

  "julkisivu-verhous": {
    questions: [
      q("materiaali", "Verhouksen materiaali", "quick", "puu", [
        { id: "puu", label: "Puupaneli", effect: {} },
        { id: "komposiitti", label: "Komposiitti / fibercement", effect: mult("verhous", 1.2) },
      ]),
      q("eriste", "Eriste", "quick", "kylla", [
        { id: "kylla", label: "Uusi eriste mukaan", effect: toggle("eriste", true) },
        { id: "ei", label: "Ei eristettä", effect: toggle("eriste", false) },
      ]),
      q("tyo", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Monimutkainen julkisivu", effect: mult("tyo", 1.15) },
      ]),
      q("telinet", "Telinet ja nostotyö", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "korkea", label: "Korkea rakennus", effect: mult("tyo", 1.12) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Verhouksen pinta-ala", "included"),
      pf("Materiaali", "included", ["materiaali"]),
      pf("Eriste", "variable", ["eriste"]),
      pf("Asennus ja telineet", "variable", ["tyo", "telinet"]),
    ],
  },

  "julkisivu-rapaus": {
    questions: [
      q("vauriot", "Rappauksen kunto", "quick", "hyva", [
        { id: "hyva", label: "Paikkaus riittää", effect: mult("korjaus", 0.7) },
        { id: "normaali", label: "Normaali korjaus", effect: {} },
        { id: "laaja", label: "Laaja uusinta", effect: mult("korjaus", 1.5) },
      ]),
      q("rapaus", "Rappaus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "mineraali", label: "Mineraalirappaus", effect: mult("rapaus", 1.15) },
      ]),
      q("maalaus", "Maalaus", "quick", "kylla", [
        { id: "kylla", label: "Maalaus mukaan", effect: toggle("maalaus", true) },
        { id: "ei", label: "Ei maalausta", effect: toggle("maalaus", false) },
      ]),
      accessQuestion("rapaus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Rapattava pinta-ala", "included"),
      pf("Korjaustarve", "variable", ["vauriot"]),
      pf("Rappaus", "included", ["rapaus"]),
      pf("Maalaus", "variable", ["maalaus"]),
    ],
  },
};
