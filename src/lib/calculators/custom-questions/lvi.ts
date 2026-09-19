import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const LVI_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  "ilmanvaihto-kone": {
    questions: [
      q("kone", "Ilmanvaihtokoneen tyyppi", "quick", "perus", [
        { id: "perus", label: "Perus (ei lämmön talteenottoa)", effect: {} },
        { id: "lto", label: "LTO (lämmön talteenotto)", effect: mult("kone", 1.35) },
      ]),
      q("kanavisto", "Kanaviston kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä / osittain uusitaan", effect: {} },
        { id: "uusitaan", label: "Koko kanavisto uusitaan", effect: mult("kanavisto", 1.5) },
      ]),
      q("auotus", "Automaatio / ohjaus", "quick", "perus", [
        { id: "perus", label: "Perusohjaus", effect: toggle("auotus", false) },
        { id: "aly", label: "Älykäs ohjaus", effect: toggle("auotus", true) },
      ]),
      q("sahko", "Sähkötyöt", "detail", "perus", [
        { id: "perus", label: "Perustaso", effect: {} },
        { id: "laaja", label: "Keskuksen päivitys", effect: mult("sahko", 1.3) },
      ]),
      accessQuestion("kanavisto"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Asunnon pinta-ala", "included"),
      pf("Koneen tyyppi", "included", ["kone"]),
      pf("Kanavisto", "variable", ["kanavisto"]),
      pf("Ohjaus ja sähkö", "variable", ["auotus", "sahko"]),
    ],
  },

  "ilmanvaihto-puhdistus": {
    questions: [
      q("laajuus", "Puhdistuksen laajuus", "quick", "perus", [
        { id: "perus", label: "Peruspuhdistus", effect: {} },
        { id: "laaja", label: "Laaja (kanavisto + kone)", effect: mult("puhdistus", 1.35) },
      ]),
      q("suodattimet", "Suodattimien vaihto", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("suodattimet", true) },
        { id: "ei", label: "Ei", effect: toggle("suodattimet", false) },
      ]),
      q("home", "Home / biohaitta", "detail", "ei", [
        { id: "ei", label: "Ei", effect: {} },
        { id: "kylla", label: "Kyllä, erityiskäsittely", effect: add(300) },
      ]),
      accessQuestion("puhdistus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Asunnon pinta-ala", "included"),
      pf("Puhdistuksen laajuus", "included", ["laajuus"]),
      pf("Suodattimet", "variable", ["suodattimet"]),
      pf("Erityistilanteet", "variable", ["home"]),
    ],
  },

  kayttovesi: {
    questions: [
      q("laajuus", "Putkiremontin laajuus", "quick", "osittain", [
        { id: "osittain", label: "Osittainen", effect: mult("putkisto", 0.7) },
        { id: "koko", label: "Koko putkisto", effect: {} },
      ]),
      q("purku", "Purkutyöt ja pinnat", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laajat purkutyöt", effect: mult("purku", 1.4) },
      ]),
      q("materiaali", "Putkimateriaali", "quick", "kupari", [
        { id: "kupari", label: "Kupari / komposiitti", effect: {} },
        { id: "muovi", label: "Muoviputki (uudis)", effect: mult("putkisto", 0.85) },
      ]),
      q("pinnat", "Pintojen palautus", "detail", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "laaja", label: "Laajat pintatyöt", effect: mult("pinnat", 1.35) },
      ]),
      accessQuestion("putkisto"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Asunnon pinta-ala", "included"),
      pf("Remontin laajuus", "included", ["laajuus"]),
      pf("Purkutyöt", "variable", ["purku"]),
      pf("Pintojen palautus", "variable", ["pinnat"]),
    ],
  },

  viemari: {
    questions: [
      q("menetelma", "Korjausmenetelmä", "quick", "suolaus", [
        { id: "suolaus", label: "Sukellus/suolaus", effect: {} },
        { id: "kaivuu", label: "Kaivuu ja uusinta", effect: mult("kaivuu", 1.5) },
      ]),
      q("kartoitus", "Kartoitus", "quick", "kylla", [
        { id: "kylla", label: "Kamerakartoitus", effect: toggle("kartoitus", true) },
        { id: "ei", label: "Ei tarvita", effect: toggle("kartoitus", false) },
      ]),
      q("vaurio", "Vaurion laajuus", "quick", "pieni", [
        { id: "pieni", label: "Pieni / yksi kohta", effect: mult("korjaus", 0.7) },
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laaja vaurio", effect: mult("korjaus", 1.5) },
      ]),
      accessQuestion("korjaus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Viemäriputken pituus", "included"),
      pf("Korjausmenetelmä", "included", ["menetelma"]),
      pf("Vaurion laajuus", "variable", ["vaurio"]),
      pf("Kartoitus ja kaivuu", "variable", ["kartoitus", "kaivuu"]),
    ],
  },

  vesivahinko: {
    questions: [
      q("laajuus", "Vaurion laajuus", "quick", "pieni", [
        { id: "pieni", label: "Pieni / yksi huone", effect: mult("korjaus", 0.6) },
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laaja vaurio", effect: mult("korjaus", 1.6) },
      ]),
      q("kuivaus", "Kuivatus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "rakenteet", label: "Rakenteiden kuivaus", effect: mult("kuivaus", 1.4) },
      ]),
      q("lvi", "LVI-vaurio", "quick", "ei", [
        { id: "ei", label: "Ei putkivaurioita", effect: toggle("lvi", false) },
        { id: "kylla", label: "Putkivaurio / uusinta", effect: toggle("lvi", true) },
      ]),
      q("purku", "Purkutyöt", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laajat purkutyöt", effect: mult("purku", 1.35) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Vaurioitunut pinta-ala", "included"),
      pf("Vaurion laajuus", "variable", ["laajuus"]),
      pf("Kuivatus", "included", ["kuivaus"]),
      pf("LVI ja purkutyöt", "variable", ["lvi", "purku"]),
    ],
  },
};
