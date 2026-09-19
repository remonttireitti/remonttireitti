import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const PERUSTUS_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  sokkeli: {
    questions: [
      q("vaurio", "Sokkelin kunto", "quick", "normaali", [
        { id: "normaali", label: "Normaali paikkaus", effect: {} },
        { id: "laaja", label: "Laaja vaurio", effect: mult("purku", 1.4) },
      ]),
      q("eriste", "Eriste", "quick", "kylla", [
        { id: "kylla", label: "Uusi eriste", effect: toggle("eriste", true) },
        { id: "ei", label: "Ei", effect: toggle("eriste", false) },
      ]),
      q("salaoja", "Salaojitus", "quick", "ei", [
        { id: "ei", label: "Ei", effect: toggle("salaoja", false) },
        { id: "kylla", label: "Kyllä / tarkistus", effect: toggle("salaoja", true) },
      ]),
      q("pinnoite", "Pinnoite", "quick", "rapaus", [
        { id: "rapaus", label: "Rapaus / maali", effect: {} },
        { id: "laatta", label: "Laattapinnoite", effect: mult("pinnoite", 1.3) },
      ]),
      accessQuestion("purku"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Sokkelin pituus", "included"),
      pf("Vaurion laajuus", "variable", ["vaurio"]),
      pf("Eriste ja salaoja", "variable", ["eriste", "salaoja"]),
      pf("Pinnoite", "included", ["pinnoite"]),
    ],
  },

  perustus: {
    questions: [
      q("tyyppi", "Perustustyyppi", "quick", "paallyste", [
        { id: "paallyste", label: "Paaluperustus", effect: {} },
        { id: "levittava", label: "Levittävä perustus", effect: mult("perustus", 0.9) },
        { id: "kallio", label: "Kallio / vaativa", effect: mult("maatyot", 1.3) },
      ]),
      q("eriste", "Eriste", "quick", "kylla", [
        { id: "kylla", label: "Eriste mukaan", effect: toggle("eriste", true) },
        { id: "ei", label: "Minimaalinen", effect: toggle("eriste", false) },
      ]),
      q("salaoja", "Salaojitus", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("salaoja", true) },
        { id: "ei", label: "Ei", effect: toggle("salaoja", false) },
      ]),
      q("maatyot", "Maatyöt", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea maaperä", effect: mult("maatyot", 1.25) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Rakennuksen pinta-ala", "included"),
      pf("Perustustyyppi", "included", ["tyyppi"]),
      pf("Maatyöt", "variable", ["maatyot"]),
      pf("Eriste ja salaoja", "variable", ["eriste", "salaoja"]),
    ],
  },

  "vaihe-eriste": {
    questions: [
      q("paksuus", "Eristeen paksuus", "quick", "300mm", [
        { id: "300mm", label: "300 mm", effect: {} },
        { id: "400mm", label: "400 mm", effect: mult("eriste", 1.25) },
      ]),
      q("hoyrynsulku", "Höyrynsulku", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("hoyrynsulku", true) },
        { id: "ei", label: "Ei", effect: toggle("hoyrynsulku", false) },
      ]),
      q("tyo", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Ahdas / vaikea pääsy", effect: mult("tyo", 1.2) },
      ]),
      accessQuestion("tyo"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Eristettävä pinta-ala", "included"),
      pf("Eristeen paksuus", "included", ["paksuus"]),
      pf("Höyrynsulku", "variable", ["hoyrynsulku"]),
      pf("Asennus", "variable", ["tyo"]),
    ],
  },
};
