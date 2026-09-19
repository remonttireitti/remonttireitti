import type { CustomCalculatorQuestions } from "./types";
import { add, mult, pf, q, toggle } from "./helpers";

export const PALVELUT_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  "siivous-koti": {
    questions: [
      q("laajuus", "Siivouksen laajuus", "quick", "perus", [
        { id: "perus", label: "Perussiivous", effect: {} },
        { id: "laaja", label: "Laaja (ikkunat, uuninpesu)", effect: mult("siivous", 1.25) },
      ]),
      q("tahti", "Tahti", "quick", "kuukausi", [
        { id: "kuukausi", label: "Kuukausittain", effect: {} },
        { id: "kerta", label: "Kertaluonteinen", effect: mult("siivous", 1.15) },
      ]),
      q("kerros", "Kerros / pääsy", "detail", "helppo", [
        { id: "helppo", label: "Helpot kuljetukset", effect: {} },
        { id: "vaikea", label: "Ylin kerros ilman hissiä", effect: mult("siivous", 1.1) },
      ]),
    ],
    priceFactors: [
      pf("Asunnon pinta-ala", "included"),
      pf("Siivouksen laajuus", "included", ["laajuus"]),
      pf("Tahti", "included", ["tahti"]),
      pf("Pääsy", "variable", ["kerros"]),
    ],
  },

  "siivous-loppu": {
    questions: [
      q("laajuus", "Remontin laajuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laaja (rakennusjäte, hienopöly)", effect: mult("siivous", 1.35) },
      ]),
      q("ikkunat", "Ikkunanpesu", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("ikkunat", true) },
        { id: "ei", label: "Ei", effect: toggle("ikkunat", false) },
      ]),
      q("kerros", "Pääsy", "detail", "helppo", [
        { id: "helppo", label: "Helppo", effect: {} },
        { id: "vaikea", label: "Vaikea", effect: mult("siivous", 1.1) },
      ]),
    ],
    priceFactors: [
      pf("Siivottava pinta-ala", "included"),
      pf("Remontin laajuus", "variable", ["laajuus"]),
      pf("Ikkunanpesu", "variable", ["ikkunat"]),
    ],
  },

  muutto: {
    questions: [
      q("laajuus", "Muuton laajuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Paljon kalusteita / raskasta", effect: mult("muutto", 1.25) },
      ]),
      q("pakkaus", "Pakkauspalvelu", "quick", "ei", [
        { id: "ei", label: "Itse pakattu", effect: toggle("pakkaus", false) },
        { id: "kylla", label: "Pakkaus mukaan", effect: toggle("pakkaus", true) },
      ]),
      q("kerros", "Kerrokset", "quick", "matala", [
        { id: "matala", label: "Matala / hissi", effect: toggle("kerros", false) },
        { id: "korkea", label: "Ylin kerros ilman hissiä", effect: toggle("kerros", true) },
      ]),
    ],
    priceFactors: [
      pf("Kuorman koko", "included"),
      pf("Muuton laajuus", "variable", ["laajuus"]),
      pf("Pakkaus", "variable", ["pakkaus"]),
      pf("Kerrokset", "variable", ["kerros"]),
    ],
  },

  kuljetus: {
    questions: [
      q("paino", "Kuorman paino / koko", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas / iso", effect: mult("kuljetus", 1.3) },
      ]),
      q("kantaminen", "Kantaminen", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Portaat / kapea", effect: mult("kantaminen", 1.35) },
      ]),
      q("etaisyys", "Etäisyys", "detail", "lahi", [
        { id: "lahi", label: "Lähellä (alle 20 km)", effect: {} },
        { id: "kauas", label: "Kauempana", effect: mult("kuljetus", 1.2) },
      ]),
    ],
    priceFactors: [
      pf("Kuljetettavien kpl", "included"),
      pf("Kuorman koko", "variable", ["paino"]),
      pf("Kantaminen", "variable", ["kantaminen"]),
      pf("Etäisyys", "variable", ["etaisyys"]),
    ],
  },

  ikkunanpesu: {
    questions: [
      q("tyyppi", "Ikkunatyyppi", "quick", "tavallinen", [
        { id: "tavallinen", label: "Tavallinen", effect: {} },
        { id: "korkea", label: "Korkeat / vaikeat", effect: mult("pesu", 1.3) },
      ]),
      q("kerrokset", "Kerrokset", "quick", "matala", [
        { id: "matala", label: "Matala / maataso", effect: {} },
        { id: "korkea", label: "Korkea (teline/nostin)", effect: mult("pesu", 1.25) },
      ]),
      q("tahti", "Tahti", "detail", "kerta", [
        { id: "kerta", label: "Kertaluonteinen", effect: {} },
        { id: "saannollinen", label: "Säännöllinen", effect: mult("pesu", 0.9) },
      ]),
    ],
    priceFactors: [
      pf("Ikkunoiden määrä", "included"),
      pf("Ikkunatyyppi", "variable", ["tyyppi"]),
      pf("Kerrokset", "variable", ["kerrokset"]),
    ],
  },

  kattopesu: {
    questions: [
      q("kate", "Kattomateriaali", "quick", "tiili", [
        { id: "tiili", label: "Tiili", effect: {} },
        { id: "pelti", label: "Pelti", effect: mult("pesu", 0.9) },
        { id: "huopa", label: "Huopa", effect: mult("pesu", 1.1) },
      ]),
      q("suojaus", "Suojaus", "quick", "kylla", [
        { id: "kylla", label: "Kasvien suojaus", effect: toggle("suojaus", true) },
        { id: "ei", label: "Ei tarvita", effect: toggle("suojaus", false) },
      ]),
      q("korkeus", "Katon korkeus", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "korkea", label: "Korkea / jyrkkä", effect: mult("pesu", 1.2) },
      ]),
    ],
    priceFactors: [
      pf("Katon pinta-ala", "included"),
      pf("Kattomateriaali", "included", ["kate"]),
      pf("Suojaus", "variable", ["suojaus"]),
      pf("Korkeus", "variable", ["korkeus"]),
    ],
  },

  "nurmikon-leikkuu": {
    questions: [
      q("tahti", "Leikkuutahti", "quick", "viikoittain", [
        { id: "viikoittain", label: "Viikoittain kaudella", effect: {} },
        { id: "harvemmin", label: "Harvemmin", effect: mult("leikkuu", 1.1) },
      ]),
      q("reunat", "Reunusleikkuu", "quick", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "tarkka", label: "Tarkka reunus / aidat", effect: mult("leikkuu", 1.15) },
      ]),
      q("jate", "Nurmikon jätteen poisto", "detail", "ei", [
        { id: "ei", label: "Kompostiin / paikalleen", effect: {} },
        { id: "kylla", label: "Poiskuljetus", effect: add(15) },
      ]),
    ],
    priceFactors: [
      pf("Nurmikon pinta-ala", "included"),
      pf("Leikkuutahti", "included", ["tahti"]),
      pf("Reunusleikkuu", "variable", ["reunat"]),
      pf("Jätehuolto", "variable", ["jate"]),
    ],
  },

  lumityo: {
    questions: [
      q("alue", "Aurausalue", "quick", "piha", [
        { id: "piha", label: "Piha / ajoväylä", effect: {} },
        { id: "kattoluukku", label: "Kattoluukku / katto", effect: mult("lumi", 1.4) },
      ]),
      q("hiekoitus", "Hiekoitus", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("hiekoitus", true) },
        { id: "ei", label: "Ei", effect: toggle("hiekoitus", false) },
      ]),
      q("tahti", "Sopimus", "detail", "kerta", [
        { id: "kerta", label: "Kertaluonteinen", effect: {} },
        { id: "kausi", label: "Kausisopimus", effect: mult("lumi", 0.85) },
      ]),
    ],
    priceFactors: [
      pf("Aurausalue", "included"),
      pf("Työn tyyppi", "included", ["alue"]),
      pf("Hiekoitus", "variable", ["hiekoitus"]),
      pf("Sopimustyyppi", "variable", ["tahti"]),
    ],
  },
};
