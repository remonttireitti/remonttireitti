import type { CustomCalculatorQuestions } from "./types";
import { accessQuestion, add, amt, extraWorkQuestion, mult, pf, q, toggle } from "./helpers";

export const SISATILAT_CUSTOM: Record<string, CustomCalculatorQuestions> = {
  kylpyhuone: {
    questions: [
      q("scope", "Remontin laajuus", "quick", "taysi", [
        { id: "taysi", label: "Täysremontti", effect: {} },
        { id: "pinta", label: "Pintaremontti (laatoitus + kalusteet)", effect: { lineEnabled: { purku: false, vesieristys: false } } },
      ]),
      q("lvi-changes", "LVI-muutokset (lattiakaivo, putkien siirto)", "quick", "ei", [
        { id: "ei", label: "Ei muutoksia", effect: {} },
        { id: "pieni", label: "Pienet muutokset", effect: mult("lvi-sahko", 1.15) },
        { id: "laaja", label: "Laajat muutokset", effect: { lineMultipliers: { "lvi-sahko": 1.45 }, fixedAdd: 1200 } },
      ]),
      q("demolition", "Purkutyön laajuus", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas (betonivalut, tiili)", effect: mult("purku", 1.35) },
      ]),
      q("fixtures", "Kalustetaso", "quick", "perus", [
        { id: "perus", label: "Perus", effect: amt("kalusteet", 1500) },
        { id: "laadukas", label: "Laadukas", effect: amt("kalusteet", 2800) },
        { id: "premium", label: "Premium", effect: amt("kalusteet", 4500) },
      ]),
      q("waterproof-detail", "Vesieristyksen laajuus", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "korkea", label: "Korkea suihkuseinä / laajempi märkätila", effect: mult("vesieristys", 1.2) },
      ]),
      q("floor-drain", "Lattiakaivon siirto", "detail", "ei", [
        { id: "ei", label: "Ei siirtoa", effect: {} },
        { id: "kylla", label: "Siirretään", effect: add(900) },
      ]),
      q("electrical", "Sähkötyöt", "detail", "perus", [
        { id: "perus", label: "Perusvalaistus", effect: {} },
        { id: "laaja", label: "Lattialämmitys + useampi piste", effect: add(750) },
      ]),
      accessQuestion("laatoitus-tyo"),
    ],
    priceFactors: [
      pf("Lattian pinta-ala", "included"),
      pf("Laatoitus ja materiaalitaso", "included"),
      pf("Purkutyö ja vesieristys", "included"),
      pf("LVI-muutokset", "variable", ["lvi-changes", "floor-drain"]),
      pf("Kalusteet", "variable", ["fixtures"]),
      pf("Rakenteelliset muutokset", "variable", ["waterproof-detail", "electrical", "site-access"]),
    ],
  },

  keittio: {
    questions: [
      q("scope", "Remontin laajuus", "quick", "taysi", [
        { id: "taysi", label: "Täysremontti", effect: {} },
        { id: "pinta", label: "Vain kalusteet ja tasot", effect: { lineEnabled: { purku: false } } },
      ]),
      q("layout", "Pohjaratkaisu", "quick", "sama", [
        { id: "sama", label: "Sama layout", effect: {} },
        { id: "muutetaan", label: "Muutetaan (putket/sähkö siirretään)", effect: { lineMultipliers: { "sahko-lvi": 1.35 }, fixedAdd: 1500 } },
      ]),
      q("kodinkoneet", "Kodinkoneet", "quick", "perus", [
        { id: "perus", label: "Perustaso", effect: {} },
        { id: "integroidut", label: "Integroidut premium", effect: mult("kodinkoneet", 1.4) },
      ]),
      q("demolition", "Purkutyö", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas (betoni, tiili)", effect: mult("purku", 1.3) },
      ]),
      q("tyo", "Asennustyön vaativuus", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea (vanha rakenne, epätaso)", effect: mult("tyo", 1.15) },
      ]),
      accessQuestion("tyo"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Keittiön pinta-ala", "included"),
      pf("Kalusteet ja materiaalitaso", "included"),
      pf("Pohjaratkaisu", "variable", ["layout"]),
      pf("Kodinkoneet", "variable", ["kodinkoneet"]),
      pf("Purkutyö ja asennus", "variable", ["demolition", "tyo", "site-access"]),
    ],
  },

  "wc-remontti": {
    questions: [
      q("scope", "Remontin laajuus", "quick", "taysi", [
        { id: "taysi", label: "Täysremontti", effect: {} },
        { id: "pinta", label: "Pintaremontti", effect: { lineEnabled: { purku: false, vesieristys: false } } },
      ]),
      q("lvi", "Putkityöt", "quick", "ei", [
        { id: "ei", label: "Ei muutoksia", effect: {} },
        { id: "kylla", label: "Putkien siirto / uusinta", effect: mult("lvi", 1.3) },
      ]),
      q("kalusteet", "Kalustetaso", "quick", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "design", label: "Design / seinä-wc", effect: mult("kalusteet", 1.5) },
      ]),
      q("vesieristys", "Vesieristys", "detail", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "laaja", label: "Laajempi märkätila", effect: mult("vesieristys", 1.2) },
      ]),
      accessQuestion("purku"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("WC:n koko", "included"),
      pf("Remontin laajuus", "included", ["scope"]),
      pf("Putkityöt", "variable", ["lvi"]),
      pf("Kalusteet", "variable", ["kalusteet"]),
      pf("Vesieristys ja lisätyöt", "variable", ["vesieristys", "extra-work"]),
    ],
  },

  sauna: {
    questions: [
      q("scope", "Remontin laajuus", "quick", "taysi", [
        { id: "taysi", label: "Täysremontti", effect: {} },
        { id: "pinta", label: "Pintaremontti (paneelit + kiuas)", effect: { lineEnabled: { purku: false } } },
      ]),
      q("kiuas", "Kiuastyyppi", "quick", "sahko", [
        { id: "sahko", label: "Sähkökiuas", effect: {} },
        { id: "puu", label: "Puu-/yhdistelmäkiuas", effect: mult("kiuas", 1.4) },
      ]),
      q("panelit", "Panelointi", "quick", "haapa", [
        { id: "haapa", label: "Haapa / perus", effect: {} },
        { id: "premium", label: "Leveä lauta / erikoispaneli", effect: mult("panelit", 1.3) },
      ]),
      q("lvi-sahko", "LVI ja sähkö", "detail", "perus", [
        { id: "perus", label: "Perustaso", effect: {} },
        { id: "laaja", label: "Uudet vedot ja valaistus", effect: mult("sahko-lvi", 1.25) },
      ]),
      accessQuestion("purku"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Saunan koko", "included"),
      pf("Kiuas", "included", ["kiuas"]),
      pf("Panelointi", "variable", ["panelit"]),
      pf("LVI ja sähkö", "variable", ["lvi-sahko"]),
      pf("Purkutyö ja lisätyöt", "variable", ["scope", "extra-work"]),
    ],
  },

  "lattia-sisä": {
    questions: [
      q("alusta", "Alustan kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä / tasainen", effect: {} },
        { id: "epataso", label: "Epätasainen", effect: mult("tasoitus", 1.3) },
        { id: "huono", label: "Huono, laaja tasoitus", effect: mult("tasoitus", 1.6) },
      ]),
      q("purku", "Vanhan lattian purku", "quick", "normaali", [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas (laatta, liima)", effect: mult("purku", 1.35) },
        { id: "ei", label: "Ei purkua", effect: toggle("purku", false) },
      ]),
      q("materiaali", "Lattiamateriaali", "quick", "laminaatti", [
        { id: "laminaatti", label: "Laminaatti", effect: amt("materiaali", 25) },
        { id: "parketti", label: "Parketti", effect: amt("materiaali", 55) },
        { id: "laatta", label: "Laatta", effect: amt("materiaali", 45) },
      ]),
      q("listat", "Listat ja viimeistely", "detail", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "laaja", label: "Laajat listat / kynnykset", effect: add(400) },
      ]),
      accessQuestion("tyo"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Lattia-ala", "included"),
      pf("Materiaali", "included", ["materiaali"]),
      pf("Alustan tasoitus", "variable", ["alusta"]),
      pf("Purkutyö", "variable", ["purku"]),
      pf("Asennus ja lisätyöt", "variable", ["tyo", "extra-work"]),
    ],
  },

  seinamaalaus: {
    questions: [
      q("pohja", "Seinien kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä / maalattu aiemmin", effect: {} },
        { id: "tasoitus", label: "Tasoitus tarvitaan", effect: mult("pohjatyot", 1.4) },
        { id: "rappaus", label: "Rappaus / paikkaus", effect: mult("pohjatyot", 1.7) },
      ]),
      q("maali", "Maalin laatu", "quick", "perus", [
        { id: "perus", label: "Perusmaali", effect: {} },
        { id: "laadukas", label: "Laadukas / hengittävä", effect: mult("maali", 1.3) },
      ]),
      q("korkeus", "Huonekorkeus", "quick", "normaali", [
        { id: "normaali", label: "Normaali (alle 2,7 m)", effect: {} },
        { id: "korkea", label: "Korkea tila", effect: mult("maalaus", 1.12) },
      ]),
      q("kalustus", "Kalustuksen suojaus", "detail", "normaali", [
        { id: "normaali", label: "Normaali suojaus", effect: {} },
        { id: "taysi", label: "Täysi suojaus / tyhjä tila", effect: mult("maalaus", 1.08) },
      ]),
      accessQuestion("maalaus"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Seinäpinta-ala", "included"),
      pf("Pohjatyöt", "variable", ["pohja"]),
      pf("Maalin laatu", "included", ["maali"]),
      pf("Huonekorkeus", "variable", ["korkeus"]),
      pf("Työn vaativuus", "variable", ["kalustus", "site-access"]),
    ],
  },

  "laatoitus-sisa": {
    questions: [
      q("pohja", "Alustan kunto", "quick", "hyva", [
        { id: "hyva", label: "Hyvä", effect: {} },
        { id: "tasoitus", label: "Tasoitus tarvitaan", effect: mult("pohja", 1.35) },
      ]),
      q("laatat", "Laatataso", "quick", "perus", [
        { id: "perus", label: "Perus", effect: {} },
        { id: "laadukas", label: "Laadukas / suuret laatat", effect: mult("laatat", 1.35) },
      ]),
      q("koko", "Laatoitusalueen muoto", "quick", "yksinkertainen", [
        { id: "yksinkertainen", label: "Yksinkertainen", effect: {} },
        { id: "monimutkainen", label: "Paljon kulmia / niches", effect: mult("tyo", 1.15) },
      ]),
      q("vesieristys", "Vesieristys", "detail", "ei", [
        { id: "ei", label: "Ei (kuiva tila)", effect: {} },
        { id: "kylla", label: "Kyllä (märkätila)", effect: add(800) },
      ]),
      accessQuestion("tyo"),
      extraWorkQuestion(),
    ],
    priceFactors: [
      pf("Laatoitusala", "included"),
      pf("Laatat", "included", ["laatat"]),
      pf("Alustan kunto", "variable", ["pohja"]),
      pf("Työn vaativuus", "variable", ["koko"]),
      pf("Vesieristys ja lisätyöt", "variable", ["vesieristys", "extra-work"]),
    ],
  },
};
