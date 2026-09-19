import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const PUULAMMITYS_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  "takka-kamiina": {
    questions: [
      q("tyyppi", "Tulisijan tyyppi", "quick", "takka", [
        { id: "takka", label: "Avotakka", effect: {} },
        { id: "kamiina", label: "Kamiina / insertti", effect: mult("laite", 0.85) },
        { id: "takkuuuni", label: "Takkuuni", effect: mult("laite", 1.3) },
      ]),
      q("hormi", "Hormi", "quick", "olemassa", [
        { id: "olemassa", label: "Olemassa oleva", effect: mult("hormi", 0.5) },
        { id: "uusi", label: "Uusi hormi", effect: {} },
      ]),
      q("perustus", "Perustus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas / laajennettu", effect: mult("perustus", 1.4) },
      ]),
      q("rakenne", "Rakennemuutokset", "detail", "ei", [
        { id: "ei", label: "Ei", effect: toggle("rakenne", false) },
        { id: "kylla", label: "Seinäaukkojen muutokset", effect: toggle("rakenne", true) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Tulisijan tyyppi", "included", ["tyyppi"]),
      pf("Hormi", "variable", ["hormi"]),
      pf("Perustus", "variable", ["perustus"]),
      pf("Rakennemuutokset", "variable", ["rakenne"]),
    ],
  },

  puukattila: {
    questions: [
      q("kattila", "Kattilan koko", "quick", "25kw", [
        { id: "25kw", label: "Noin 25 kW", effect: {} },
        { id: "40kw", label: "Noin 40 kW", effect: mult("kattila", 1.25) },
      ]),
      q("hormi", "Hormi", "quick", "olemassa", [
        { id: "olemassa", label: "Olemassa oleva", effect: mult("hormi", 0.6) },
        { id: "uusi", label: "Uusi / pinnoitus", effect: {} },
      ]),
      q("patterit", "Patteriverkko", "quick", "kunnossa", [
        { id: "kunnossa", label: "Kunnossa", effect: mult("patterit", 0.5) },
        { id: "osittain", label: "Osittainen uusinta", effect: {} },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Lämmitettävä pinta-ala", "included"),
      pf("Kattilan koko", "included", ["kattila"]),
      pf("Hormi", "variable", ["hormi"]),
      pf("Patteriverkko", "variable", ["patterit"]),
    ],
  },

  hormi: {
    questions: [
      q("toimenpide", "Toimenpide", "quick", "pinnoitus", [
        { id: "pinnoitus", label: "Pinnoitus", effect: toggle("pinnoitus", true) },
        { id: "uusinta", label: "Täysi uusinta", effect: { lineEnabled: { pinnoitus: false }, fixedAdd: 4000 } },
      ]),
      q("korkeus", "Hormin korkeus", "quick", "normaali", [
        { id: "normaali", label: "Normaali (alle 10 m)", effect: {} },
        { id: "korkea", label: "Korkea", effect: mult("pinnoitus", 1.2) },
      ]),
      q("pelti", "Piipun pellitys", "quick", "kylla", [
        { id: "kylla", label: "Uusitaan", effect: toggle("pelti", true) },
        { id: "ei", label: "Ei", effect: toggle("pelti", false) },
      ]),
      q("nuohous", "Nuohous ennen työtä", "detail", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("nuohous", true) },
        { id: "ei", label: "Ei", effect: toggle("nuohous", false) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Hormin korkeus", "included"),
      pf("Toimenpide", "included", ["toimenpide"]),
      pf("Piipun pellitys", "variable", ["pelti"]),
      pf("Nuohous", "variable", ["nuohous"]),
    ],
  },

  "puulammitys-varaaja": {
    questions: [
      q("koko", "Varaajan koko", "quick", "normaali", [
        { id: "normaali", label: "Normaali (500–1000 l)", effect: {} },
        { id: "suuri", label: "Suuri (yli 1000 l)", effect: mult("varaaja", 1.3) },
      ]),
      q("eristys", "Eristys", "quick", "kylla", [
        { id: "kylla", label: "Uusi eristys", effect: toggle("eristys", true) },
        { id: "ei", label: "Ei", effect: toggle("eristys", false) },
      ]),
      q("asennus", "Asennus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea pääsy", effect: mult("asennus", 1.15) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Varaajien määrä", "included"),
      pf("Varaajan koko", "included", ["koko"]),
      pf("Eristys", "variable", ["eristys"]),
      pf("Asennus", "variable", ["asennus"]),
    ],
  },
};
