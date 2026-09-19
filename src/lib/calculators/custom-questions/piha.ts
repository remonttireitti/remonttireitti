import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const PIHA_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  terassi: {
    questions: [
      q("materiaali", "Terassimateriaali", "quick", "painuma", [
        { id: "painuma", label: "Painumateriaali", effect: {} },
        { id: "lauta", label: "Terassilauta (kova)", effect: mult("lattia", 1.2) },
        { id: "komposiitti", label: "Komposiitti", effect: mult("lattia", 1.35) },
      ]),
      q("perustus", "Perustus", "quick", "ponttoni", [
        { id: "ponttoni", label: "Pilarit / ponttoni", effect: {} },
        { id: "maassa", label: "Maassa (betoni)", effect: mult("perustus", 1.25) },
      ]),
      q("kaide", "Kaide / kaiteet", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("kaide", true) },
        { id: "ei", label: "Ei", effect: toggle("kaide", false) },
      ]),
      q("korkeus", "Terassin korkeus", "detail", "normaali", [
        { id: "normaali", label: "Matala (alle 0,5 m)", effect: {} },
        { id: "korkea", label: "Korkea (yli 0,5 m)", effect: mult("runko", 1.2) },
      ]),
      accessQuestion("runko"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Terassin pinta-ala", "included"),
      pf("Materiaali", "included", ["materiaali"]),
      pf("Perustus", "variable", ["perustus"]),
      pf("Kaide ja korkeus", "variable", ["kaide", "korkeus"]),
    ],
  },

  pihatie: {
    questions: [
      q("pinnoite", "Pinnoite", "quick", "asfaltti", [
        { id: "asfaltti", label: "Asfaltti", effect: {} },
        { id: "kivet", label: "Nupukivi / betoni", effect: mult("pinnoite", 1.15) },
        { id: "sora", label: "Sora (kevyempi)", effect: mult("pinnoite", 0.7) },
      ]),
      q("maatyot", "Maatyöt", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea maaperä / kallio", effect: mult("maatyot", 1.3) },
      ]),
      q("reunus", "Reunakiveys", "quick", "kylla", [
        { id: "kylla", label: "Kyllä", effect: toggle("reunus", true) },
        { id: "ei", label: "Ei", effect: toggle("reunus", false) },
      ]),
      accessQuestion("maatyot"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Pinta-ala", "included"),
      pf("Pinnoite", "included", ["pinnoite"]),
      pf("Maatyöt", "variable", ["maatyot"]),
      pf("Reunakiveys", "variable", ["reunus"]),
    ],
  },

  aita: {
    questions: [
      q("materiaali", "Aidamateriaali", "quick", "puu", [
        { id: "puu", label: "Puutomu", effect: {} },
        { id: "metalli", label: "Metalliaita", effect: mult("aita", 1.15) },
        { id: "betoni", label: "Betoni / kivimuuri", effect: mult("aita", 1.5) },
      ]),
      q("korkeus", "Aidan korkeus", "quick", "18", [
        { id: "18", label: "1,8 m", effect: {} },
        { id: "20", label: "2,0 m", effect: mult("aita", 1.12) },
      ]),
      q("portti", "Portti", "quick", "ei", [
        { id: "ei", label: "Ei porttia", effect: toggle("portti", false) },
        { id: "kylla", label: "Portti mukaan", effect: toggle("portti", true) },
      ]),
      q("maasto", "Maasto", "detail", "tasainen", [
        { id: "tasainen", label: "Tasainen", effect: {} },
        { id: "epatasainen", label: "Epätasainen / kallio", effect: mult("tolpat", 1.2) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Aidon pituus ja korkeus", "included"),
      pf("Materiaali", "included", ["materiaali"]),
      pf("Portti", "variable", ["portti"]),
      pf("Maasto", "variable", ["maasto"]),
    ],
  },

  piharakennus: {
    questions: [
      q("tyyppi", "Rakennuksen tyyppi", "quick", "aitta", [
        { id: "aitta", label: "Aitta / varasto", effect: {} },
        { id: "autokatos", label: "Autokatos / lato", effect: mult("materiaalit", 1.3) },
        { id: "vierasmaja", label: "Vierasmaja", effect: mult("materiaalit", 1.6) },
      ]),
      q("perustus", "Perustus", "quick", "harkko", [
        { id: "harkko", label: "Harkkoperustus", effect: {} },
        { id: "paalu", label: "Paaluperustus", effect: mult("perustus", 1.2) },
      ]),
      q("sahko-lvi", "Sähkö / LVI", "quick", "ei", [
        { id: "ei", label: "Ei", effect: toggle("sahko-lvi", false) },
        { id: "sahko", label: "Sähkö", effect: toggle("sahko-lvi", true) },
        { id: "molemmat", label: "Sähkö + LVI", effect: mult("sahko-lvi", 1.5) },
      ]),
      q("nosturi", "Nosturi / kuljetus", "detail", "ei", [
        { id: "ei", label: "Ei tarvita", effect: toggle("nosturi", false) },
        { id: "kylla", label: "Nosturi tarvitaan", effect: toggle("nosturi", true) },
      ]),
      accessQuestion("tyo"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Rakennuksen pinta-ala", "included"),
      pf("Rakennuksen tyyppi", "included", ["tyyppi"]),
      pf("Perustus", "variable", ["perustus"]),
      pf("Sähkö/LVI ja nostotyö", "variable", ["sahko-lvi", "nosturi"]),
    ],
  },
};
