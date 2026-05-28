import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
  type HeatPumpSlug,
} from "@/constants/heat-pumps";

export type TroubleshootingCheck = {
  id: string;
  title: string;
  detail: string;
  /** Näytetään vain näille (esim. ilmansuodatin vain ILP). */
  onlyFor?: readonly HeatPumpSlug[];
  /** Ei näytetä näille pumpputyypeille. */
  skipFor?: readonly HeatPumpSlug[];
  /** Korvaa otsikon ja tekstin tyypeittäin (tarkistetaan ennen skipFor). */
  byPump?: Partial<Record<HeatPumpSlug, { title: string; detail: string }>>;
};

export function resolveCheckForPump(
  check: TroubleshootingCheck,
  pump: HeatPumpSlug,
): { title: string; detail: string } | null {
  if (check.onlyFor && !check.onlyFor.includes(pump)) return null;
  const override = check.byPump?.[pump];
  if (override) return override;
  if (check.skipFor?.includes(pump)) return null;
  return { title: check.title, detail: check.detail };
}

export function resolveGuideSummaryForPump(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): string {
  return guide.summaryByPump?.[pump] ?? guide.summary;
}

export function resolveGuideBulletsForPump(
  bullets: string[],
  byPump: TroubleshootingGuide["doNotDoByPump"],
  pump: HeatPumpSlug,
): string[] {
  return byPump?.[pump] ?? bullets;
}

export type TroubleshootingGuide = {
  slug: string;
  title: string;
  summary: string;
  /** Korvaa summaryn tietyillä pumpputyypeillä. */
  summaryByPump?: Partial<Record<HeatPumpSlug, string>>;
  /** Vastaa huolto-lomakkeen oire-tagia. */
  maintenanceSymptom: string;
  safeChecks: TroubleshootingCheck[];
  doNotDo: string[];
  doNotDoByPump?: Partial<Record<HeatPumpSlug, string[]>>;
  callProWhen: string[];
  callProWhenByPump?: Partial<Record<HeatPumpSlug, string[]>>;
  pumpNotes?: Partial<Record<HeatPumpSlug, string>>;
};

export const TROUBLESHOOTING_GUIDES: TroubleshootingGuide[] = [
  {
    slug: "ei-lammita",
    title: "Ei lämmitä",
    summary:
      "Lämpö ei riitä tai lämmönjako ei nouse (ILP: huone; VILP/maalämpö: patterit tai lattialämpö). Aloita turvallisista perusasioista ennen huoltokutsua.",
    maintenanceSymptom: "Ei lämmitä",
    safeChecks: [
      {
        id: "mode-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Lämmitystila päällä (ei automaatti)",
        detail:
          "Kun tarvitset lämpöä, valitse nimenomaan lämmitystila (heat) — älä jätä automaattitilaa talvella. Automaatti voi lämmittää liikaa, vaihtaa viilennykseen, ja taas lämmitykseen, jolloin huone tuntuu kylmältä vaikka laite “tekee töitä”. Aseta tavoitelämpö lämmitystilassa (esim. 20–22 °C).",
      },
      {
        id: "mode-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Lämpötila-asetus ja lämmityspiiri",
        detail:
          "Tarkista lämpöpumpun ohjauskeskuksen ja huoneen lämpötila-asetus (esim. 20–22 °C). Varmista patteriventtiilit auki, kiertovesipumppu käynnissä ja lämmönjaon lämpö nousee.",
      },
      {
        id: "mode-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Lämpötila-asetus ja lämmönjako",
        detail:
          "Tarkista lämpöpumpun ja huoneen lämpötila-asetus. Varmista lämmönjaon pumppu käynnissä ja lämpö nousee pattereissa tai lattialämmössä.",
      },
      {
        id: "filter-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Sisäyksikön ilmansuodatin",
        detail:
          "Puhdista tai vaihda jaetun sisäyksikön ilmansuodatin. Tukkeutunut suodatin heikentää lämmönjakoa.",
      },
      {
        id: "filter-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Lämmönjaon kierto",
        detail:
          "Varmista patteriventtiilit auki ja kiertovesipumppu käynnissä. Lämmön pitäisi nousta lämmönjaossa — ei ilmansuodatinta.",
      },
      {
        id: "filter-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Lämmönjaon kierto",
        detail:
          "Varmista patteriventtiilit auki ja kiertovesipumppu käynnissä. Lämmön pitäisi nousta pattereissa tai lattialämmössä.",
      },
      {
        id: "outdoor-air",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Ulkoyksikkö — esteet ja lumi ympärillä",
        detail:
          "Poista lumi, lehdet ja esteet laitteen ympäriltä ja puhaltimen edestä. Älä raavi tai hakkoa jäätä kennon lamelista — taittunutta tai vaurioitunutta kennoa ei yleensä korjata; usein kenno tai koko ulkoyksikkö pitää uusia.",
      },
      {
        id: "outdoor-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Lämpöpumppuyksikkö ja näyttö",
        detail:
          "Tarkista vikakoodi ja että lämpöpumppuyksikkö (tekniikkahuone) käynnistyy. Lämpö tulee maasta tai vesistä keruupiirin kautta — ei ilmakennoa eikä sulatusta.",
      },
      {
        id: "breaker",
        title: "Sulake / vikakatkaisin",
        detail:
          "Tarkista ettei sulake ole noussut. Käynnistä laite uudelleen ohjekirjan mukaan (virtakatkaisin pois → odota → päälle).",
      },
      {
        id: "control-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Kaukosäädin ja ajastukset",
        detail:
          "Tarkista kaukosäädin (paristot), tavoitelämpö ja ajastukset. Poista poissaolo-/yöajastukset, jotka estävät lämmityksen.",
      },
      {
        id: "control-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Ohjauskeskus ja huonetermostaatti",
        detail:
          "Tarkista lämpöpumpun ohjauskeskuksen tai näytön lämpötila-asetus, huoneen termostaatti ja patteritermostaatit. Vesi-ilmalämpöpumpussa ei ole ILP:n kaukosäädintä.",
      },
      {
        id: "control-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Ohjaus ja huonetermostaatti",
        detail:
          "Tarkista lämpöpumpun ja huoneen lämpötila-asetus sekä lämmönjaon ajastukset. Poista mahdolliset poissaolo-/yöajastukset.",
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
    callProWhenByPump: {
      maalampopumppu: [
        "Virhekoodi palaa heti uudelleen käynnistyksen jälkeen.",
        "Lämpöpumppuyksikkö ei käynnisty tai keruupiirin lämpötila poikkeaa (näyttö/ohje).",
        "Lämpö ei riitä pitkään aikaan kokeiluista huolimatta.",
      ],
    },
    pumpNotes: {
      ilmalampopumppu:
        "Ilmalämpöpumpuissa automaattitila on usein syynä “ei lämmitä kunnolla” -tilanteeseen — kokeile lämmitystilaa ensin.",
      ilmavesilampopumppu:
        "Vesi-ilmalämpöpumppu lämmittää vettä patteriverkkoon tai lattialämmöön — oire on usein lämmönjaossa, ei “ilmatilassa”.",
      maalampopumppu:
        "Yleisiä syitä: lämmönjako, keruupiirin lämpötila, nestemäärä. Ei ulkoista ilmakennoa — mittaukset asentajalta.",
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
        onlyFor: ["ilmalampopumppu"],
        title: "Viilennystila päällä (ei automaatti)",
        detail:
          "Kun tarvitset viilennystä, valitse nimenomaan viilennystila (cool) — älä luota automaattitilaan. Aseta tavoitelämpö hieman alemmas (esim. 22–24 °C).",
      },
      {
        id: "filter-cool",
        onlyFor: ["ilmalampopumppu"],
        title: "Ilmansuodatin ja ulkoyksikkö",
        detail: "Puhdista sisäyksikön ilmansuodatin. Varmista ettei ulkoyksikkö ole tukossa.",
      },
      {
        id: "doors",
        onlyFor: ["ilmalampopumppu"],
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
      "Kevyt huurre pakkasella voi olla normaalia. Paksu jää ulkoyksikön kennossa tai toistuva jäätyminen vaatii lähes aina ammattilaisen — pelkkä lumen ja jään kuorinta ei riitä.",
    maintenanceSymptom: "Ei lämmitä",
    safeChecks: [
      {
        id: "defrost",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Sulatusjakso",
        detail:
          "Pakkasella laite sulattaa välillä itse. Odota yksi sulatusjakso (noin 15–30 min). Jos lämpö palaa ja jää ei kasaannu uudelleen paksuna kerroksena, kyse voi olla normaalista käytöstä.",
      },
      {
        id: "snow-around",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Lumi ja esteet vain ympärillä",
        detail:
          "Voit poistaa lumen ja jäätökset laitteen ympäriltä ja puhaltimen edestä. Älä raavi, hakkoa tai paina kennon lamelia — ne taittuvat helposti. Jo selvä vaurio tarkoittaa usein kennon tai koko laitteen vaihtoa, ei huoltoa.",
      },
      {
        id: "observe-pattern-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Toistuuko paksu jää?",
        detail:
          "Jos jää palaa heti sulatuksen jälkeen, peittää kennon paksuna tai lämmitys heikkenee selvästi, syy on usein ulkoyksikön jäätymisessä (kylmäaine, anturi, paine). Siihen tarvitaan asentajan mittaukset.",
      },
      {
        id: "observe-pattern-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Toistuuko paksu jää?",
        detail:
          "Jos jää palaa heti sulatuksen jälkeen tai lämmönjako heikkenee selvästi, syy on ulkoyksikön jäätymisessä tai lämmönjaon kierrossa. Asentajan mittaukset.",
      },
      {
        id: "filter-ice",
        onlyFor: ["ilmalampopumppu"],
        title: "Sisäyksikön ilmansuodatin",
        detail:
          "Likainen ilmansuodatin voi heikentää toimintaa — puhdista. Paksu jää ulkoyksikössä on erillinen vika.",
      },
    ],
    doNotDo: [
      "Älä raavi, hakkoa tai käytä teräspäätä, lapetta tai jäähakkuria kennon pinnassa — vaurioitunutta kennoa ei korjata, vaan uusitaan.",
      "Älä kaada kuumaa vettä ulkoyksikön päälle (vaurio ja turvallisuusriski).",
      "Älä luule, että jään poisto kennoista korjaa ongelman pysyvästi — syy pitää selvittää.",
    ],
    callProWhen: [
      "Paksu jää kennossa tai jää palaa heti uudelleen sulatuksen jälkeen.",
      "Lämpö ei nouse pakkasella tai laite menee usein häiriötilaan.",
      "Näet taittuneita tai vaurioituneita kennon lamelia — kenno tai laite uusittava, ei korjattavissa.",
      "Lämmönjako ei lähene (VILP).",
      "Epäilet kylmäainevikaa, vuotoa tai poikkeavaa ääntä kompressorista.",
    ],
    pumpNotes: {
      ilmalampopumppu:
        "Ulkoyksikön jäätyminen on yleisin syy, kun “ei lämmitä pakkasella”. Käytä lämmitystilaa — älä automaattia.",
      ilmavesilampopumppu:
        "Tarkista onko lämmönjaon pumppu käynnissä. Ulkoyksikön jäätyminen vaatii silti usein asentajan.",
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
        id: "loose-air",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Irralliset osat",
        detail:
          "Tarkista onko ulkoyksikön kansi löysällä tai puhaltimessa oksia, lehtiä tai roskaa (laite pois päältä).",
      },
      {
        id: "loose-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Lämpöpumppuyksikkö",
        detail:
          "Tarkista tekniikkahuoneen lämpöpumppuyksikön kansi ja kiinnitykset (laite pois päältä). Ei ulkoista ilmakennoa eikä sulatusta.",
      },
      {
        id: "mount-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Kiinnitys",
        detail: "Sisä- ja ulkoyksikön kiinnikkeet — löysä teline voi resonoida.",
      },
      {
        id: "mount-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Kiinnitys ja pumppu",
        detail:
          "Tarkista ulkoyksikön teline ja tekniikkahuoneen kiertovesipumpun kiinnitys — löysä runko resonoi.",
      },
      {
        id: "mount-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Kiinnitys ja pumppu",
        detail:
          "Tarkista lämpöpumppuyksikön ja kiertovesipumpun kiinnitys tekniikkahuoneessa — ei ulkoista ilmakennoa.",
      },
      {
        id: "when-air",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Milloin ääni kuuluu",
        detail:
          "Kirjaa milloin ääni kuuluu (käynnistys, sulatus, jatkuva). Helpottaa huoltoa.",
      },
      {
        id: "when-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Milloin ääni kuuluu",
        detail:
          "Kirjaa milloin ääni kuuluu (käynnistys, kiertopumppu, jatkuva). Ei sulatusjaksoa kuten ilmalämpöpumpussa.",
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
      "ILP: kondenssivesi sisäyksiköstä (näkyvä letku). Erottele tippa/sulatus ja jatkuva vuoto sisälle.",
    summaryByPump: {
      ilmavesilampopumppu:
        "VILP:ssä ei ole ILP:n sisäyksikön kondenssiputkea. Tarkista ulkoyksikön sulatusvesi ja lämmönjaon näkyvät vuodot (patterit, liitokset, tekniikkahuone).",
      maalampopumppu:
        "Maalämmössä vuoto on lähes aina lämmönjaossa tai keruupiirissä — ei sisäyksikön kondenssivedestä.",
    },
    maintenanceSymptom: "Vuoto / kondenssivesi",
    safeChecks: [
      {
        id: "outdoor-drip",
        onlyFor: ["ilmalampopumppu", "ilmavesilampopumppu"],
        title: "Ulkoyksikkö tippuu",
        detail:
          "Pakkasella sulatuksessa ulkoyksikön alle voi tulla vettä — usein normaalia. Varmista ettei lumi tai jää tuki veden poistumista laitteen alta (älä raavi kennoa).",
      },
      {
        id: "indoor-drain-hose",
        onlyFor: ["ilmalampopumppu"],
        title: "Sisäyksikön poistoputki (näkyvä letku)",
        detail:
          "Jos näet ulospäin tulevan kondenssiputken tai letkun, tarkista ettei se ole poikki tai litistynyt. Tukoksen voi joskus irrottaa imuroimalla letkun ulkopäästä vesi-imurilla — älä avaa sisäyksikön kantta.",
      },
      {
        id: "hydronic-visible",
        onlyFor: ["ilmavesilampopumppu", "maalampopumppu"],
        title: "Lämmönjaon näkyvät vuodot",
        detail:
          "Tarkista patteriliitokset, lattiakaivo, tekniikkahuoneen putket ja lattialla/käytävässä näkyvä lätäkkö. Painemittari vain lue — älä avaa suljettua piiriä.",
      },
      {
        id: "amount-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Määrä ja paikka",
        detail:
          "Muutama tippa tai pieni lätäkkö voi olla normaalia. Jatkuva virta sisäyksiköstä lattialle tai seinälle ei ole.",
      },
      {
        id: "amount-hydronic",
        onlyFor: ["ilmavesilampopumppu", "maalampopumppu"],
        title: "Määrä ja paikka",
        detail:
          "Hidas tippuminen patteriliitännästä tai lattiakaivosta on vika. Jatkuva lätäkkö, paineen lasku näytöllä tai jäätyminen putkissa → ammattilainen.",
      },
    ],
    doNotDo: [
      "Älä avaa sisäyksikön kantta keräilyaltaan takia — et yleensä pääse siihen turvallisesti itse.",
      "Älä avaa kylmäainepuolia.",
      "Älä sivuuta vuotoa sähkölaitteiden lähellä — sammuta tarvittaessa.",
    ],
    doNotDoByPump: {
      ilmavesilampopumppu: [
        "Älä avaa lämmönjakopiiriä, expansiovesaa tai sulkuventtiilejä itse.",
        "Älä sekoita ILP:n kondenssiohjeita — VILP:ssä ei ole sisäyksikön kondenssiputkea.",
        "Älä sivuuta vuotoa sähkölaitteiden lähellä — sammuta tarvittaessa.",
      ],
      maalampopumppu: [
        "Älä avaa maalämpö- tai lämmönjakopiiriä itse.",
        "Älä tee nestemäärän tai paineen säätöjä ilman asentajaa.",
        "Älä sivuuta vuotoa sähkölaitteiden lähellä — sammuta tarvittaessa.",
      ],
    },
    callProWhen: [
      "Vettä valuu jatkuvasti sisäyksiköstä huoneeseen.",
      "Vesimäärä kasvaa nopeasti tai haju/kemikaalin jäljettä.",
      "Epäilet kylmäainevuotoa (öljymäinen jäännös ulkoyksikön luona).",
    ],
    callProWhenByPump: {
      ilmavesilampopumppu: [
        "Lämmönjaosta, patterista tai tekniikkahuoneesta vuotaa jatkuvasti.",
        "Lämmönjaon paine laskee tai laite näyttää paine-/kiertoilmoituksen.",
        "Jäätyminen lämmönjaon putkissa tai epäilet kylmäainevuotoa.",
      ],
      maalampopumppu: [
        "Vuoto keruupiirissä, lämmönjaossa tai tekniikkahuoneessa.",
        "Paine-/virhekoodi tai lämpö ei nouse vuodosta huolimatta.",
        "Epäilet maalämpönesteen (glykoli) vuotoa.",
      ],
    },
    pumpNotes: {
      ilmalampopumppu:
        "Yleisin: tukkeutunut kondenssiputki tai keräilyallas — vain näkyvä letku, ei kannen avaus.",
      ilmavesilampopumppu:
        "Yleisiä aiheita: patterivuoto, löysä liitos, kiertovesipumppu ei käy, paine laskee. Ei sisäkondenssiputkea.",
      maalampopumppu:
        "Vuodot ja paine-asiat vaativat lähes aina asentajan.",
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
          "Etsi koodi käyttöohjeesta tai valmistajan sivuilta — osa koodeista on ohjeistettuja (sulatus, anturi).",
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
        onlyFor: ["ilmalampopumppu"],
        title: "Ilmansuodatin ja ulkoyksikkö",
        detail: "Likainen ilmansuodatin ja tukkeutunut ulkoyksikkö nostavat kulutusta.",
      },
      {
        id: "hydronic-power-vilp",
        onlyFor: ["ilmavesilampopumppu"],
        title: "Lämpötila-asetus ja ulkoyksikkö",
        detail:
          "Liian korkea lämpötila-asetus tai tukkeutunut ulkoyksikkö (lumi/esteet) nostavat kulutusta. Lämmönjaon ongelma voi pakottaa sähkölisälämmön.",
      },
      {
        id: "hydronic-power-maalampo",
        onlyFor: ["maalampopumppu"],
        title: "Lämpötila-asetus ja lämmönjako",
        detail:
          "Liian korkea asetus, heikko lämmönjako tai sähkövastus/lisälämpö käynnissä nostavat kulutusta. Keruupiirin ongelma heikentää COP:ia — vaatii mittauksia.",
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
      ilmavesilampopumppu:
        "Korkea kulutus usein: ulkoyksikkö tukossa, lämmönjako ei kierrä, sähkövastus/lisälämpö käy tai liian korkea asetus.",
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
        id: "local-ilp",
        onlyFor: ["ilmalampopumppu"],
        title: "Paikallinen ohjaus",
        detail:
          "Toimiiko kaukosäädin tai seinätermostaatti? Jos kyllä, vika on yleensä verkossa/sovelluksessa.",
      },
      {
        id: "local-hydronic",
        onlyFor: ["ilmavesilampopumppu", "maalampopumppu"],
        title: "Paikallinen ohjaus",
        detail:
          "Toimiiko lämpöpumpun näyttö, ohjauskeskus tai huonetermostaatti? Jos kyllä, vika on yleensä verkossa/sovelluksessa.",
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
    resolveGuideSummaryForPump(params.guide, params.pumpSlug),
    tried ? `Kokeiltu: ${tried}.` : "Kokeiltu: ei merkittyjä kohtia.",
    "Ongelma ei ratkennut — pyydän tarjouksia huoltoon/korjaukseen.",
  ];

  const q = new URLSearchParams();
  q.set("laite", params.pumpSlug);
  q.set("oire", params.guide.maintenanceSymptom);
  q.set("kuvaus", parts.join(" "));
  return q.toString();
}
