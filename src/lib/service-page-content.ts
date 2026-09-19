/** Palvelusivujen SEO-sisältö — FAQ, laajuus ja sisälinkit slug-kategorian mukaan. */

export type ServiceContentBlock = {
  scopeTitle: string;
  scopeItems: string[];
  faq: { question: string; answer: string }[];
  relatedLinks: { href: string; label: string }[];
};

const HEAT_PUMP_SLUGS = new Set([
  "ilmalampopumppu",
  "ilmavesilampopumppu",
  "maalampopumppu",
  "lammitys-vaihto",
  "lammopumppu-huolto",
  "lammopumppu-korjaus",
]);

const RENOVATION_SLUGS = new Set([
  "kylpyhuone",
  "keittio",
  "wc-remontti",
  "sauna",
  "lattia-sisä",
  "seinamaalaus",
  "laatoitus-sisa",
  "ikkunat",
  "ovet-ulko",
  "katto-pelti",
  "rannit",
  "ulkomaalaus",
  "julkisivu-verhous",
  "julkisivu-rapaus",
  "sokkeli",
  "perustus",
  "vaihe-eriste",
  "terassi",
  "pihatie",
  "aita",
]);

const MAINTENANCE_SLUGS = new Set([
  "siivous-koti",
  "siivous-loppu",
  "muutto",
  "kuljetus",
  "ikkunanpesu",
  "kattopesu",
  "nurmikon-leikkuu",
  "lumityo",
]);

function heatPumpContent(name: string, slug: string): ServiceContentBlock {
  const pumpSlug =
    slug === "lammopumppu-huolto" || slug === "lammopumppu-korjaus"
      ? "ilmalampopumppu"
      : slug;

  return {
    scopeTitle: "Mitä tarjouspyyntöön kannattaa kertoa",
    scopeItems: [
      "Kohteen tyyppi (omakotitalo, rivitalo, mökki) ja lämmitysmuoto",
      "Nykyinen laite tai suunniteltu malli ja teho (kW)",
      "Asennuspaikka, putkireitit ja sähkökeskuksen etäisyys",
      "Haluatko vain työn, vai myös laitteen urakoitsijalta",
      "Toivottu aloitus ja budjettikehys",
    ],
    faq: [
      {
        question: `Paljonko ${name.toLowerCase()} maksaa Suomessa?`,
        answer:
          "Hinta riippuu kohteesta, laitteesta ja työn laajuudesta. Vertaa anonymisoituja hintoja Hinta-arkistosta ja pyydä tarjouksia alueeltasi — saat vertailukelpoiset hinnat samassa muodossa.",
      },
      {
        question: "Onko kilpailutus ilmaista asiakkaalle?",
        answer:
          "Kyllä. Tarjouspyynnön luominen ja tarjousten vertailu on asiakkaalle 0 €. Maksat urakoitsijalle suoraan valitsemasi tarjouksen mukaan.",
      },
      {
        question: "Lämpöpumppu ei toimi — kannattaako kilpailuttaa heti?",
        answer:
          "Käy ensin läpi Vian selvitys -oppaat (suodatin, termostaatti, virhekoodi). Jos vika jää, voit kilpailuttaa huollon tai korjauksen samalla alustalla.",
      },
    ],
    relatedLinks: [
      { href: "/hinta-arkisto", label: "Hinta-arkisto — toteutuneet hinnat" },
      { href: "/laskurit", label: "Remonttilaskurit" },
      { href: `/vian-selvitys/${pumpSlug}`, label: "Lämpöpumpun vian selvitys" },
      { href: "/huolto/uusi", label: "Huolto- tai korjauspyyntö" },
    ],
  };
}

function renovationContent(name: string): ServiceContentBlock {
  return {
    scopeTitle: "Mitä remonttipyyntöön kannattaa kertoa",
    scopeItems: [
      "Huoneen koko (m²) ja nykytila — mitä puretaan ja mitä jää",
      "Toiveet materiaaleista ( laatoitus, kalusteet, lattia )",
      "Sähkö-, putki- tai ilmanvaihtomuutokset",
      "Kuvat nykytilasta ja luonnoksista",
      "Budjetti ja toivottu aloitus",
    ],
    faq: [
      {
        question: `Paljonko ${name.toLowerCase()} maksaa?`,
        answer:
          "Remontin hinta vaihtelee kohteen kunnon, pinta-alan ja materiaalivalintojen mukaan. Kilpailuttamalla saat useita tarjouksia samassa muodossa — helpompi vertailla kuin yksittäiset puhelutarjoukset.",
      },
      {
        question: "Tarvitsenko rakennusluvan?",
        answer:
          "Pienet sisäremontit eivät yleensä vaadi lupaa. Rakenteisiin, julkisivuun tai putkistoon liittyvissä töissä urakoitsija neuvoo luvista. Mainitse epävarmuus tarjouspyynnössä.",
      },
      {
        question: "Miten vertailen urakoitsijoita?",
        answer:
          "Remonttireitissä tarjoukset ovat samassa rakenteessa: hinta, aloitus, kesto, laajuus ja takuu. Voit tingata vastatarjouksella ennen hyväksyntää.",
      },
    ],
    relatedLinks: [
      { href: "/tarjouspyynnot", label: "Avoimet tarjouspyynnöt" },
      { href: "/asiakkaalle", label: "Ohje asiakkaalle" },
      { href: "/tarjousarvio", label: "Tarjousvahti — puolueeton arvio" },
    ],
  };
}

function maintenanceContent(name: string): ServiceContentBlock {
  return {
    scopeTitle: "Mitä palvelupyyntöön kannattaa kertoa",
    scopeItems: [
      "Kohteen sijainti ja pääsy (avain, portti, parkkipaikka)",
      "Toistuvuus: kertaluonteinen vai jatkuva sopimus",
      "Laajuus (esim. huoneiden määrä, piha-ala, ajoreitti)",
      "Erityistoiveet tai allergiat",
      "Toivottu ajankohta",
    ],
    faq: [
      {
        question: `Miten ${name.toLowerCase()} kilpailutetaan?`,
        answer:
          "Kuvaile työ ja alue — urakoitsijat tai palveluntarjoajat jättävät tarjouksia. Vertaile hintaa ja ehtoja, valitse paras tai tingi vastatarjouksella.",
      },
      {
        question: "Voiko palvelun tilata jatkuvana?",
        answer:
          "Kyllä. Merkitse tarjouspyyntöön toistuvuus (esim. viikoittain, kuukausittain). Urakoitsija voi tarjota sopimushintaa.",
      },
      {
        question: "Onko palvelu ilmainen asiakkaalle?",
        answer:
          "Tarjouspyynnön luominen on 0 €. Maksat valitsemasi urakoitsijan kanssa sovitun hinnan.",
      },
    ],
    relatedLinks: [
      { href: "/palvelut#palvelut", label: "Kaikki kunnossapitopalvelut" },
      { href: "/tarjouspyynnot", label: "Avoimet pyynnöt" },
    ],
  };
}

function defaultContent(name: string): ServiceContentBlock {
  return {
    scopeTitle: "Mitä tarjouspyyntöön kannattaa kertoa",
    scopeItems: [
      "Työn laajuus ja nykytilanne",
      "Kohde ja sijainti (postinumero riittää alkuun)",
      "Kuvat ja mitat, jos saatavilla",
      "Budjetti ja aikataulutoive",
      "Erityisvaatimukset (luvat, materiaalit, brändi)",
    ],
    faq: [
      {
        question: `Miten ${name.toLowerCase()} kilpailutetaan Remonttireitissä?`,
        answer:
          "Täytät ohjatun tarjouspyynnön, julkaiset sen ja saat tarjouksia alueeltasi. Vertailet hintoja ja ehtoja samassa muodossa — asiakkaalle 0 €.",
      },
      {
        question: "Kuinka monta tarjousta yleensä saan?",
        answer:
          "Riippuu alueesta ja työstä. Tyypillisesti useita tarjouksia muutaman päivän sisällä. Voit seurata tilannetta omalta tililtäsi.",
      },
      {
        question: "Voinko muokata pyyntöä julkaisun jälkeen?",
        answer:
          "Kyllä — voit täydentää kuvausta ja kuvia. Urakoitsijat näkevät päivitetyt tiedot ennen tarjousta.",
      },
    ],
    relatedLinks: [
      { href: "/palvelut", label: "Kaikki palvelut" },
      { href: "/asiakkaalle", label: "Asiakkaalle — näin aloitat" },
    ],
  };
}

export function getServicePageContent(
  slug: string,
  name: string,
): ServiceContentBlock {
  if (HEAT_PUMP_SLUGS.has(slug)) return heatPumpContent(name, slug);
  if (RENOVATION_SLUGS.has(slug)) return renovationContent(name);
  if (MAINTENANCE_SLUGS.has(slug)) return maintenanceContent(name);
  return defaultContent(name);
}
