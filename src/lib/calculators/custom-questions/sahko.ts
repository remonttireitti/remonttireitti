import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const SAHKO_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  latauspiste: {
    questions: [
      q("teho", "Latausteho", "quick", "11kw", [
        { id: "11kw", label: "11 kW (3-vaihe)", effect: {} },
        { id: "22kw", label: "22 kW", effect: mult("laite", 1.35) },
      ]),
      q("kaapeli", "Kaapelointi", "quick", "normaali", [
        { id: "normaali", label: "Alle 15 m", effect: {} },
        { id: "pitka", label: "Pitkä reitti (yli 15 m)", effect: mult("kaapeli", 1.5) },
      ]),
      q("keskus", "Sähkökeskus", "quick", "riittaa", [
        { id: "riittaa", label: "Nykyinen riittää", effect: toggle("keskus", false) },
        { id: "paivitys", label: "Keskuksen päivitys", effect: toggle("keskus", true) },
      ]),
      q("asennus", "Asennus", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (betoni, ulko)", effect: mult("asennus", 1.2) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Latauspisteiden määrä", "included"),
      pf("Latausteho", "included", ["teho"]),
      pf("Kaapelointi", "variable", ["kaapeli"]),
      pf("Sähkökeskus", "variable", ["keskus"]),
    ],
  },

  aurinkopaneelit: {
    questions: [
      q("koko", "Järjestelmän koko", "quick", "5kw", [
        { id: "5kw", label: "Noin 5 kW", effect: {} },
        { id: "10kw", label: "Noin 10 kW", effect: mult("paneelit", 1.8) },
      ]),
      q("kattotyyppi", "Kattotyyppi", "quick", "kattopelti", [
        { id: "kattopelti", label: "Kattopelti / tiili", effect: {} },
        { id: "huopa", label: "Huopa / tasakatto", effect: mult("asennus", 1.15) },
      ]),
      q("invertteri", "Invertteri", "quick", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "hybrid", label: "Hybrid / akkuvalmius", effect: mult("invertteri", 1.3) },
      ]),
      q("sahko", "Sähkötyöt", "detail", "perus", [
        { id: "perus", label: "Perustaso", effect: {} },
        { id: "laaja", label: "Keskuksen päivitys", effect: mult("sahko", 1.35) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Paneelien määrä", "included"),
      pf("Järjestelmän koko", "included", ["koko"]),
      pf("Kattotyyppi ja asennus", "variable", ["kattotyyppi"]),
      pf("Invertteri ja sähkö", "variable", ["invertteri", "sahko"]),
    ],
  },

  sahkokeskus: {
    questions: [
      q("keskus", "Keskuksen koko", "quick", "normaali", [
        { id: "normaali", label: "Normaali omakotitalo", effect: {} },
        { id: "suuri", label: "Suuri / useita piirejä", effect: mult("keskus", 1.35) },
      ]),
      q("maadoitus", "Maadoitus", "quick", "tarkistus", [
        { id: "tarkistus", label: "Tarkistus / päivitys", effect: toggle("maadoitus", true) },
        { id: "uusi", label: "Uusi maadoitus", effect: mult("maadoitus", 1.4) },
      ]),
      q("asennus", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (vanha talo)", effect: mult("asennus", 1.2) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Keskusten määrä", "included"),
      pf("Keskuksen koko", "included", ["keskus"]),
      pf("Maadoitus", "variable", ["maadoitus"]),
      pf("Asennus", "variable", ["asennus"]),
    ],
  },

  "sahko-lisays": {
    questions: [
      q("tyyppi", "Pisteen tyyppi", "quick", "pistorasia", [
        { id: "pistorasia", label: "Pistorasia", effect: {} },
        { id: "valaisin", label: "Valaisin / katto", effect: mult("pisteet", 1.2) },
      ]),
      q("kaapeli", "Kaapelointi", "quick", "normaali", [
        { id: "normaali", label: "Normaali reitti", effect: {} },
        { id: "pitka", label: "Pitkä / vaikea reitti", effect: mult("kaapeli", 1.4) },
      ]),
      q("rakenne", "Seinärakenne", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "betoni", label: "Betoni / tiili", effect: add(80) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Pisteiden määrä", "included"),
      pf("Pisteen tyyppi", "included", ["tyyppi"]),
      pf("Kaapelointi", "variable", ["kaapeli"]),
      pf("Rakenne", "variable", ["rakenne"]),
    ],
  },

  "ulko-valaistus": {
    questions: [
      q("valaisin", "Valaisintyyppi", "quick", "perus", [
        { id: "perus", label: "Perus ulkovalaisin", effect: {} },
        { id: "design", label: "Design / korkealaatuinen", effect: mult("valaisimet", 1.4) },
      ]),
      q("kaapeli", "Kaapelointi", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "uusi", label: "Uusi kaapelointi maahan", effect: mult("asennus", 1.3) },
      ]),
      q("ohjaus", "Ohjaus", "quick", "kytkin", [
        { id: "kytkin", label: "Kytkin", effect: toggle("ohjaus", false) },
        { id: "liike", label: "Liike-/ hämäräkytkin", effect: toggle("ohjaus", true) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Valaisimien määrä", "included"),
      pf("Valaisintyyppi", "included", ["valaisin"]),
      pf("Kaapelointi", "variable", ["kaapeli"]),
      pf("Ohjaus", "variable", ["ohjaus"]),
    ],
  },
};
