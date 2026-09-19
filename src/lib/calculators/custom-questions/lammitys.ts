import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, amt, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const LAMMITYS_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  "ilmalampopumppu": {
    questions: [
      q("putkireitti", "Putkireitin pituus (sisä–ulkoyksikkö)", "quick", "normaali", [
        { id: "normaali", label: "Enintään 4 m (perusasennus)", effect: {} },
        { id: "pitka", label: "5–8 m", effect: mult("lisaputki", 1.5) },
        { id: "erittain-pitka", label: "Yli 8 m", effect: mult("lisaputki", 2.2) },
      ], "Perusasennukseen kuuluu tyypillisesti 3–4 m putkitusta."),
      q("lapivienti", "Seinäläpivienti", "quick", "normaali", [
        { id: "normaali", label: "Normaali rakenne", effect: {} },
        { id: "timantti", label: "Betoni / tiili (timanttiporaus)", effect: add(250) },
        { id: "useita", label: "Useampi läpivienti", effect: add(450) },
      ]),
      q("sahko", "Sähkönsyöttö", "quick", "pistorasia", [
        { id: "pistorasia", label: "Valmis pistorasia lähellä", effect: toggle("sahko-taulu", false) },
        { id: "taululta", label: "Uusi syöttö taululta", effect: toggle("sahko-taulu", true) },
        { id: "taululta-pitka", label: "Taululta, pitkä kaapelointi", effect: { lineEnabled: { "sahko-taulu": true }, fixedAdd: 200 } },
      ]),
      q("ulkoyksikko", "Ulkoyksikön kiinnitys", "quick", "seinä", [
        { id: "seinä", label: "Seinäkiinnitys", effect: toggle("maateline", false) },
        { id: "maateline", label: "Maateline", effect: toggle("maateline", true) },
        {
          id: "korkea",
          label: "Korkea asennus / nostin",
          effect: { lineEnabled: { maateline: true }, fixedAdd: 350 },
        },
      ]),
      q("vanha-laite", "Vanha laite", "detail", "ei", [
        { id: "ei", label: "Ei vanhaa laitetta", effect: toggle("vanhan-poisto", false) },
        { id: "kylla", label: "Vanhan purku ja poisvienti", effect: toggle("vanhan-poisto", true) },
      ]),
      q("kondenssivesi", "Kondenssiveden ohjaus", "detail", "normaali", [
        { id: "normaali", label: "Normaali ohjaus", effect: {} },
        { id: "pumppu", label: "Kondenssivesipumppu tarvitaan", effect: add(180) },
      ]),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Laite- / tehotaso", "included"),
      pf("Putkireitin pituus", "included", ["putkireitti"]),
      pf("Läpiviennit ja rakenne", "variable", ["lapivienti"]),
      pf("Sähkönsyöttö", "variable", ["sahko"]),
      pf("Ulkoyksikön asennus", "variable", ["ulkoyksikko", "vanha-laite"]),
      pf("Kondenssivesi ja lisätyöt", "variable", ["kondenssivesi", "extra-work"]),
    ],
  },

  "ilmavesilampopumppu": {
    questions: [
      q("patteriverkko", "Patteriverkon kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä kunto", effect: {} },
        { id: "osittain", label: "Osittainen uusinta", effect: mult("patteri-liitos", 1.3) },
        { id: "huono", label: "Huono, laaja uusinta", effect: { lineMultipliers: { "patteri-liitos": 1.6 }, fixedAdd: 2000 } },
      ]),
      q("putkisto", "Putkireitin pituus", "quick", "normaali", [
        { id: "normaali", label: "Normaali (alle 10 m)", effect: {} },
        { id: "pitka", label: "Pitkä reitti", effect: mult("lisaputki", 1.5) },
      ]),
      q("sahko", "Sähkötyöt", "quick", "perus", [
        { id: "perus", label: "Perustaso riittää", effect: {} },
        { id: "keskus", label: "Keskuksen päivitys", effect: mult("sahko", 1.4) },
      ]),
      q("asennus", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (timanttiporaus, ahdas)", effect: mult("asennus", 1.15) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Laite", "included"),
      pf("Patteriverkko", "variable", ["patteriverkko"]),
      pf("Putkistot", "included", ["putkisto"]),
      pf("Sähkötyöt", "variable", ["sahko"]),
      pf("Asennuksen vaativuus", "variable", ["asennus", "site-access"]),
    ],
  },

  "maalampopumppu": {
    questions: [
      q("kaivotyyppi", "Maalämpökeruu", "quick", "poraus", [
        { id: "poraus", label: "Porakaivo", effect: {} },
        { id: "nauha", label: "Maalämpönauha", effect: mult("kaivo", 0.85) },
        { id: "vaativa", label: "Vaativa maaperä / kallio", effect: mult("kaivo", 1.25) },
      ]),
      q("patterit", "Lämmönjako", "quick", "patterit", [
        { id: "patterit", label: "Olemassa oleva patteriverkko", effect: {} },
        { id: "lattia", label: "Lattialämmitys osittain", effect: add(4000) },
      ]),
      q("sahko", "Sähkökeskus", "quick", "riittaa", [
        { id: "riittaa", label: "Nykyinen riittää", effect: toggle("sahko", false) },
        { id: "paivitys", label: "Keskuksen vahvistus", effect: toggle("sahko", true) },
      ]),
      q("asennus", "Asennuksen vaativuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea tekniikkahuone", effect: mult("asennus", 1.12) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Lämmitettävä pinta-ala", "included"),
      pf("Maalämpökaivo", "variable", ["kaivotyyppi"]),
      pf("Lämmönjako", "variable", ["patterit"]),
      pf("Sähkökeskus", "variable", ["sahko"]),
      pf("Asennus ja lisätyöt", "variable", ["asennus", "extra-work"]),
    ],
  },

  "lammitys-vaihto": {
    questions: [
      q("vanha-jarjestelma", "Vanha lämmitysmuoto", "quick", "oljy", [
        { id: "oljy", label: "Öljylämmitys", effect: {} },
        { id: "sahko", label: "Sähkölämmitys", effect: mult("purku", 0.7) },
        { id: "puu", label: "Puulämmitys / takka", effect: mult("purku", 0.85) },
      ]),
      q("uusi-jarjestelma", "Uusi järjestelmä", "quick", "ilmavesi", [
        { id: "ilmavesi", label: "Vesi-ilmälämpöpumppu", effect: amt("laite", 6000) },
        { id: "maalampo", label: "Maalämpö", effect: amt("laite", 12000) },
        { id: "ilmalampo", label: "Ilmalämpö + patterit", effect: amt("laite", 4500) },
      ]),
      q("patterit", "Patteriverkko", "quick", "kunnossa", [
        { id: "kunnossa", label: "Kunnossa", effect: mult("patterit", 0.5) },
        { id: "osittain", label: "Osittainen uusinta", effect: {} },
        { id: "uusitaan", label: "Laaja uusinta", effect: mult("patterit", 1.5) },
      ]),
      q("lattialammitys", "Lattialämmitys", "quick", "ei", [
        { id: "ei", label: "Ei", effect: toggle("lattialammitys", false) },
        { id: "osittain", label: "Osittain", effect: toggle("lattialammitys", true) },
      ]),
      accessQuestion("asennus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Lämmitettävä pinta-ala", "included"),
      pf("Vanhan järjestelmän purku", "included", ["vanha-jarjestelma"]),
      pf("Uusi lämmitysjärjestelmä", "included", ["uusi-jarjestelma"]),
      pf("Patteriverkko", "variable", ["patterit"]),
      pf("Lattialämmitys ja lisätyöt", "variable", ["lattialammitys", "extra-work"]),
    ],
  },
};
