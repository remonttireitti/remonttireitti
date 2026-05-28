import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
  type HeatPumpSlug,
} from "@/constants/heat-pumps";

export type TroubleshootingCheck = {
  id: string;
  title: string;
  detail: string;
};

export type TroubleshootingGuide = {
  slug: string;
  title: string;
  summary: string;
  /** Vastaa huolto-lomakkeen oire-tagia. */
  maintenanceSymptom: string;
  safeChecks: TroubleshootingCheck[];
  doNotDo: string[];
  callProWhen: string[];
  pumpNotes?: Partial<Record<HeatPumpSlug, string>>;
};

export const TROUBLESHOOTING_GUIDES: TroubleshootingGuide[] = [
  {
    slug: "ei-lammita",
    title: "Ei lämmitä",
    summary:
      "Lämpöpumppu ei lämmittä tiloja tai lämpö ei riitä. Aloita turvallisista perusasioista ennen huoltokutsua.",
    maintenanceSymptom: "Ei lämmitä",
    safeChecks: [
      {
        id: "mode",
        title: "Lämmitystila päällä (ei automaatti)",
        detail:
          "Kun tarvitset lämpöä, valitse nimenomaan lämmitystila (heat) — älä jätä automaattitilaa talvella. Automaatti voi lämmittää liikaa, vaihtaa viilennykseen, ja taas lämmitykseen, jolloin huone tuntuu kylmältä vaikka laite “tekee töitä”. Aseta tavoitelämpö lämmitystilassa (esim. 20–22 °C).",
      },
      {
        id: "filter",
        title: "Sisäyksikön suodatin",
        detail:
          "Puhdista tai vaihda sisäyksikön ilmansuodatin. Tukkeutunut suodatin heikentää lämmönjakoa ja voi estää toiminnan.",
      },
      {
        id: "outdoor",
        title: "Ulkoyksikkö",
        detail:
          "Poista lumi, lehdet ja esteet ulkoyksikön edestä ja puhaltimesta. Ilmavirta pitää olla vapaa.",
      },
      {
        id: "breaker",
        title: "Sulake / vikakatkaisin",
        detail:
          "Tarkista ettei sulake ole noussut. Käynnistä laite uudelleen ohjekirjan mukaan (virtakatkaisin pois → odota → päälle).",
      },
      {
        id: "remote",
        title: "Ohjaus ja kellonajo",
        detail:
          "Tarkista kaukosäädin/termostaatti, paristot ja etäohjaus. Poista mahdolliset ajastus-estot.",
      },
    ],
    doNotDo: [
      "Älä avaa kylmäainepiiriä tai pura putkistoa itse.",
      "Älä tee sähkökytkentöjä ilman pätevyyttä.",
      "Älä jatka käyttöä, jos näet vuotoa, palaneen hajua tai jatkuvaa virhekoodia.",
    ],
    callProWhen: [
      "Virhekoodi palaa heti uudelleen käynnistyksen jälkeen.",
      "Ulkoyksikkö ei käynnisty (ei ääntä / ei tuuleta).",
      "Lämpö ei riitä pitkään aikaan kokeiluista huolimatta.",
    ],
    pumpNotes: {
      ilmalampopumppu:
        "Ilmalämpöpumpuissa automaattitila on usein syynä “ei lämmitä kunnolla” -tilanteeseen — kokeile lämmitystilaa ensin.",
      ilmavesilampopumppu:
        "Tarkista myös lämmityspiiri: patteriventtiilit auki, kiertovesipumppu käy ja lämpötila nousee lämmönjaossa. Lämmitystila, ei automaatti.",
      maalampopumppu:
        "Maalämmössä tarkista lämmönjaon pumppu ja lämpötilat. Maalämpökeruussa ongelma vaatii usein asentajan.",
    },
  },
  {
    slug: "ei-jaahdyta",
    title: "Ei jäähdytä",
    summary:
      "Viilennys ei toimi kesällä tai huone pysyy liian lämpimänä viilennystilassa.",
    maintenanceSymptom: "Ei jäähdytä",
    safeChecks: [
      {
        id: "cool-mode",
        title: "Viilennystila päällä (ei automaatti)",
        detail:
          "Kun tarvitset viilennystä, valitse nimenomaan viilennystila (cool) — älä luota automaattitilaan. Aseta tavoitelämpö hieman alemmas (esim. 22–24 °C).",
      },
      {
        id: "filter-cool",
        title: "Suodatin ja ilmavirta",
        detail: "Puhdista sisäsuodatin. Varmista ettei ulkoyksikkö ole tukossa.",
      },
      {
        id: "doors",
        title: "Ikkunat ja ovet",
        detail: "Sulje ikkunat/ovet viilennysalueella — pieni laite ei jäähdytä koko taloa.",
      },
      {
        id: "restart-cool",
        title: "Uudelleenkäynnistys",
        detail: "Sammuta virta 5 minuutiksi ja käynnistä uudelleen.",
      },
    ],
    doNotDo: [
      "Älä täytä kylmäainetta itse.",
      "Älä avaa laitteen kansiota ilman ohjetta.",
    ],
    callProWhen: [
      "Vain lämmitys toimii, viilennys ei koskaan.",
      "Jäätyminen ulkoyksikössä kesällä (epätavallista).",
      "Virhekoodi liittyen paineeseen tai kompressoriin.",
    ],
    pumpNotes: {
      maalampopumppu:
        "Monessa maalämpöjärjestelmässä viilennys vaatii erillisen jäähdytyspiirin — tarkista onko se käytössä.",
    },
  },
  {
    slug: "jaaatyys",
    title: "Jäätyy tai huurteessa",
    summary:
      "Ulkoyksikössä tai putkissa on huurretta/jää, erityisesti pakkasella.",
    maintenanceSymptom: "Ei lämmitä",
    safeChecks: [
      {
        id: "defrost",
        title: "Sulatusjakso",
        detail:
          "Pakkasella ulkoyksikkö sulattaa välillä — odota 15–30 min. Jos lämpö palaa, kyse voi olla normaalista sulatuksesta.",
      },
      {
        id: "airflow-ice",
        title: "Ilmavirta",
        detail: "Poista lumi jään päältä ulkoyksiköstä. Varmista esteetön ilmankierto.",
      },
      {
        id: "filter-ice",
        title: "Sisäsuodatin",
        detail: "Likainen suodatin voi aiheuttaa epätavallista käyttäytymistä — puhdista.",
      },
    ],
    doNotDo: [
      "Älä hakkaa jäätä teräsvälineillä laitteesta.",
      "Älä kaada kuumaa vettä ulkoyksikön päälle.",
    ],
    callProWhen: [
      "Jää ei poistu sulatuksen jälkeen tai toistuu päivittäin.",
      "Sisäyksiköstä tippuu vettä sisälle tai seinällä on jää.",
      "Lämpö ei nouse lainkaan pakkasella.",
    ],
    pumpNotes: {
      ilmavesilampopumppu:
        "Tarkista onko lämmönjaon pumppu käynnissä — jäätyminen voi liittyä kiertoon.",
    },
  },
  {
    slug: "outo-aani",
    title: "Outo ääni",
    summary:
      "Vinkuna, kolina, jysäys tai kohina poikkeaa normaalista käyntiäänestä.",
    maintenanceSymptom: "Outo ääni",
    safeChecks: [
      {
        id: "loose",
        title: "Irralliset osat",
        detail:
          "Tarkista onko ulkoyksikön kansi löysällä, oksetta tai roskaa puhaltimessa (laite pois päältä).",
      },
      {
        id: "mount",
        title: "Kiinnitys",
        detail: "Sisä- ja ulkoyksikön kiinnikkeet — löysä teline voi resonoida.",
      },
      {
        id: "when",
        title: "Milloin ääni kuuluu",
        detail:
          "Kirjaa milloin ääni kuuluu (käynnistys, sulatus, jatkuva). Helpottaa huoltoa.",
      },
    ],
    doNotDo: [
      "Älä irrota siivet tai moottoria itse.",
      "Älä jatka käyttöä, jos kuuluu metallin kolinaa tai polttanut haju.",
    ],
    callProWhen: [
      "Ääni on uusi ja voimistuu.",
      "Kone pysähtyy äänen yhteydessä.",
      "Öljy- tai kemikaalin haju.",
    ],
  },
  {
    slug: "vuoto",
    title: "Vuoto tai kondenssivesi",
    summary:
      "Vettä laitteen alta, putkista tai sisäyksiköstä — erottele normaali kondenssi ja vika.",
    maintenanceSymptom: "Vuoto / kondenssivesi",
    safeChecks: [
      {
        id: "condensate",
        title: "Kondenssiveden viemäri",
        detail:
          "Ulkoyksikön ja sisäyksikön kondenssiputki oltava auki ja viemäriin. Puhdista tukos.",
      },
      {
        id: "drain-pan",
        title: "Sisäyksikön alusta",
        detail: "Tarkista kondenssialusta ja poistoputki — tukos aiheuttaa vuodon sisälle.",
      },
      {
        id: "amount",
        title: "Määrä ja paikka",
        detail:
          "Muutama tippa ulkona sulatuksessa on usein normaalia. Jatkuva lätäkkö ei ole.",
      },
    ],
    doNotDo: [
      "Älä avaa kylmäainepuolia.",
      "Älä sivuuta vuotoa sähkölaitteiden lähellä — sammuta tarvittaessa.",
    ],
    callProWhen: [
      "Vesimäärä kasvaa nopeasti.",
      "Vettä tippuu sisäyksiköstä seinälle tai lattialle.",
      "Epäilet kylmäaine- tai lämmönjakopiirivuotoa (öljymäinen jäännös, jäätyminen putkissa).",
    ],
    pumpNotes: {
      ilmavesilampopumppu:
        "Lämmönjakoputket ja liitokset — tarkista näkyvät tiput, mutta älä avaa suljettua piiriä.",
      maalampopumppu:
        "Maalämpöjärjestelmän vuodot vaativat lähes aina ammattilaisen.",
    },
  },
  {
    slug: "virhekoodi",
    title: "Virhekoodi näytöllä",
    summary:
      "Näytöllä tai sovelluksessa koodi (esim. E09, U4). Kirjaa koodi ennen toimenpiteitä.",
    maintenanceSymptom: "Virhekoodi näytöllä",
    safeChecks: [
      {
        id: "write-code",
        title: "Kirjaa koodi",
        detail:
          "Kirjoita virhekoodi, laite (merkki/malli) ja milloin se ilmestyi. Ota kuva näytöstä.",
      },
      {
        id: "manual",
        title: "Valmistajan ohje",
        detail:
          "Etsi koodi käyttöohjeesta tai valmistajan sivuilta — osa koodeista on ohjeistettuja (suodatin, sulatus).",
      },
      {
        id: "reset-once",
        title: "Yksi uudelleenkäynnistys",
        detail:
          "Sammuta virta 5 min, käynnistä. Jos koodi poistuu ja laite toimii, seuraa tilannetta.",
      },
    ],
    doNotDo: [
      "Älä nollaa koodia toistuvasti ilman syyn selvittämistä.",
      "Älä tee kaasutyötä itse.",
    ],
    callProWhen: [
      "Sama koodi palaa heti.",
      "Koodi liittyy kompressoriin, paineeseen tai anturiin (ohjeen mukaan).",
      "Laite ei käynnisty ollenkaan.",
    ],
  },
  {
    slug: "korkea-kulutus",
    title: "Korkea sähkönkulutus",
    summary:
      "Sähkölasku nousi tai laite tuntuu kuluttavan enemmän kuin aiemmin.",
    maintenanceSymptom: "Korkea sähkönkulutus",
    safeChecks: [
      {
        id: "filter-power",
        title: "Suodatin ja ilmavirta",
        detail: "Likainen suodatin ja tukkeutunut ulkoyksikkö nostavat kulutusta.",
      },
      {
        id: "setpoint",
        title: "Lämpötila-asetukset",
        detail:
          "Liian korkea tavoitelämpö tai jatkuva lisälämpö (sähköpatteri) nostaa kulutusta.",
      },
      {
        id: "compare",
        title: "Vertaa aikaa",
        detail:
          "Pakkaskaudella kulutus on normaalisti korkeampi. Vertaa samaa jaksoa edelliseen vuoteen.",
      },
    ],
    doNotDo: [
      "Älä säädä kylmäainetta tai kompressoriasetuksia itse.",
    ],
    callProWhen: [
      "Kulutus nousi äkillisesti ilman säämuutosta.",
      "Laite käy jatkuvasti ilman taukoja.",
      "Epäilet vikaa kompressorissa tai nestemäärässä.",
    ],
    pumpNotes: {
      maalampopumppu:
        "Maalämmön COP heikkenee, jos keruupiiri tai lämmönjako on vajaa — vaatii mittauksia.",
    },
  },
  {
    slug: "etäohjaus",
    title: "Etäohjaus ei toimi",
    summary:
      "Sovellus, Wi-Fi-ohjaus tai älykotiyhteys ei vastaa.",
    maintenanceSymptom: "Etäohjaus ei toimi",
    safeChecks: [
      {
        id: "wifi",
        title: "Verkko ja sovellus",
        detail:
          "Tarkista Wi-Fi, sovelluksen kirjautuminen ja laiteohjaimen yhteys valmistajan ohjeen mukaan.",
      },
      {
        id: "local",
        title: "Paikallinen ohjaus",
        detail:
          "Toimiiko kaukosäädin tai seinätermostaatti? Jos kyllä, vika on yleensä verkossa/sovelluksessa.",
      },
      {
        id: "update",
        title: "Päivitys / uudelleenparitus",
        detail: "Kokeile sovelluksen uudelleenyhdistämistä ohjekirjan mukaan.",
      },
    ],
    doNotDo: [
      "Älä nollaa laitteen asetuksia tuntematta asennusparametreja.",
    ],
    callProWhen: [
      "Paikallinen ohjauskin ei toimi.",
      "Laite on asennettu äskettäin eikä verkko-ohjausta saatu toimimaan asennuksen yhteydessä.",
    ],
  },
];

const guideBySlug = new Map(TROUBLESHOOTING_GUIDES.map((g) => [g.slug, g]));

export function getTroubleshootingGuide(
  symptomSlug: string,
): TroubleshootingGuide | null {
  return guideBySlug.get(symptomSlug) ?? null;
}

/** Oireet tyypeittäin (järjestys näyttöön). */
export const SYMPTOM_SLUGS_BY_PUMP: Record<HeatPumpSlug, string[]> = {
  ilmalampopumppu: [
    "ei-lammita",
    "ei-jaahdyta",
    "jaaatyys",
    "virhekoodi",
    "vuoto",
    "outo-aani",
    "korkea-kulutus",
    "etäohjaus",
  ],
  ilmavesilampopumppu: [
    "ei-lammita",
    "ei-jaahdyta",
    "jaaatyys",
    "virhekoodi",
    "vuoto",
    "outo-aani",
    "korkea-kulutus",
    "etäohjaus",
  ],
  maalampopumppu: [
    "ei-lammita",
    "virhekoodi",
    "vuoto",
    "outo-aani",
    "korkea-kulutus",
    "etäohjaus",
  ],
};

export function isHeatPumpSlug(slug: string): slug is HeatPumpSlug {
  return (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug);
}

export function pumpLabel(slug: HeatPumpSlug): string {
  return HEAT_PUMP_MARKETING[slug].title;
}

export function buildTroubleshootingHuoltoQuery(params: {
  pumpSlug: HeatPumpSlug;
  guide: TroubleshootingGuide;
  triedCheckIds: string[];
}): string {
  const tried = params.guide.safeChecks
    .filter((c) => params.triedCheckIds.includes(c.id))
    .map((c) => c.title)
    .join(", ");

  const parts = [
    `Vian selvitys (${pumpLabel(params.pumpSlug)}): ${params.guide.title}.`,
    params.guide.summary,
    tried ? `Kokeiltu: ${tried}.` : "Kokeiltu: ei merkittyjä kohtia.",
    "Ongelma ei ratkennut — pyydän tarjouksia huoltoon/korjaukseen.",
  ];

  const q = new URLSearchParams();
  q.set("laite", params.pumpSlug);
  q.set("oire", params.guide.maintenanceSymptom);
  q.set("kuvaus", parts.join(" "));
  return q.toString();
}
