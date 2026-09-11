import { SHOW_MARKETPLACE_IN_MARKETING } from "@/lib/marketing-focus";

/** Asiakkaalle näytettävät palvelut ja ominaisuudet — markkinointikuvaukset. */

export type CustomerOffering = {
  id: string;
  title: string;
  tagline: string;
  body: string;
  bullets: string[];
  href: string;
  cta: string;
  accent: "sky" | "emerald" | "orange" | "violet" | "stone";
};

export const CUSTOMER_FREE_HIGHLIGHTS = [
  "Tarjouspyyntö ja julkaisu — 0 €",
  "Tarjousten vertailu — 0 €",
  "Vastatarjoukset — 0 €",
  "Vian selvitys (lämpöpumppu) — 0 €",
  "Huoltokirja — 0 €",
] as const;

export const CUSTOMER_OFFERINGS: CustomerOffering[] = [
  {
    id: "remontti",
    title: "Kilpailuta remontti tai asennus",
    tagline: "Useita tarjouksia yhdestä pyynnöstä",
    body:
      "Keittiö, kylpyhuone, katto, lämmitys, sähkö, LVI, terassi… Kuvaile työ ja lisää kuvat — saat useilta urakoitsijoilta vertailukelpoiset tarjoukset samassa muodossa.",
    bullets: [
      "Ilmainen tarjouspyyntö, ei sitoumusta",
      "Hinta, laajuus, takuu ja aikataulu samassa paketissa",
      "Voit tingata vastatarjouksella",
    ],
    href: "/remontti/uusi",
    cta: "Aloita remonttipyyntö",
    accent: "sky",
  },
  {
    id: "palvelut",
    title: "Palvelut ja kunnossapito",
    tagline: "Kertaluonteinen tai jatkuva",
    body:
      "Siivous, piha, lumityö, nurmikon leikkuu, muutto, kuljetus, ikkunanpesu… Tilaa kertakäynti tai pyydä tarjous esim. viikoittaisesta piha- tai siivouspalvelusta.",
    bullets: [
      "Sama vertailumalli kuin remonteissa",
      "Kerro taajuus ja alue — urakoitsija hinnoittelee selkeästi",
      "Sopii myös pieniin arjen töihin",
    ],
    href: "/palvelut",
    cta: "Selaa palveluja",
    accent: "emerald",
  },
  {
    id: "vian-selvitys",
    title: "Lämpöpumpun vian selvitys",
    tagline: "Ilmainen ennen huoltokäyntiä",
    body:
      "Ei lämmitä, virhekoodi tai vuoto? Valitse pumpputyyppi ja oire — saat selkeän listan, mitä voit tarkistaa itse turvallisesti ennen kuin tilaat ammattilaisen.",
    bullets: [
      "Ei huoltokäyntiä vielä — vain ohje oireeseen",
      "Jos vika jää, siirry suoraan huoltopyyntöön",
      "Kokeilemasi kohdat menevät automaattisesti asentajalle",
    ],
    href: "/vian-selvitys",
    cta: "Selvitä vika",
    accent: "orange",
  },
  {
    id: "huolto",
    title: "Huolto ja korjaus",
    tagline: "Kilpailuta ammattilainen",
    body:
      "Lämpöpumpun huolto, korjaus tai muu kiireellinen työ. Kuvaile tilanne, liitä kuvat ja saa tarjouksia alueesi urakoitsijoilta.",
    bullets: [
      "Sopii kun vian selvitys ei riittänyt",
      "Sama ilmainen vertailu asiakkaalle",
      "Valitse tekijä arvioiden ja tarjousten perusteella",
    ],
    href: "/huolto/uusi",
    cta: "Pyydä huoltotarjouksia",
    accent: "orange",
  },
  {
    id: "vertailu",
    title: "Vertaa ja tingaa",
    tagline: "Sinä päätät hinnasta",
    body:
      "Kaikki tarjoukset samassa muodossa — helppo vertailla. Jos hinta tuntuu korkealta, ehdota alhaisempaa vastatarjouksella ennen hyväksyntää.",
    bullets: [
      "Näet urakoitsijan arvostelut ja pätevyydet",
      "Hyväksyt vain sopivan tarjouksen",
      "Maksat työn suoraan valitsemallesi tekijälle",
    ],
    href: "/remontti/uusi",
    cta: "Kokeile kilpailutusta",
    accent: "violet",
  },
  {
    id: "huoltokirja",
    title: "Huoltokirja kotiin",
    tagline: "Muistaa puolestasi",
    body:
      "Valmiit urakat, huollot ja laitteet kertyvät omaan huoltokirjaasi. Seuraavalla kerralla tiedät mitä on tehty ja kuka on työstänyt.",
    bullets: [
      "Historia remonteista ja huolloista",
      "Helpottaa seuraavaa remonttia tai huoltoa",
      "Ilmainen osa palvelua",
    ],
    href: "/oma-tili/huoltokirja",
    cta: "Tutustu huoltokirjaan",
    accent: "sky",
  },
  {
    id: "hinta-arkisto",
    title: "Hinta-arkisto",
    tagline: "Realistinen budjetti-arvio",
    body:
      "Katso anonymisoituja hintoja aiemmista hyväksytyistä tarjouksista — auttaa arvioimaan onko saamasi tarjous kohtuullinen.",
    bullets: [
      "Hinnat hyväksytyistä diileistä",
      "Voit rajata tyypin ja alueen",
      "Ei sido — vain apu budjetointiin",
    ],
    href: "/hinta-arkisto",
    cta: "Katso hinta-arkisto",
    accent: "stone",
  },
  ...(SHOW_MARKETPLACE_IN_MARKETING
    ? [
        {
          id: "tori" as const,
          title: "Remonttitori",
          tagline: "Osta ja myy remonttiin liittyvää",
          body:
            "Käytetyt keittiöt, kylpyhuonekalusteet, lämpöpumput, varaosat ja työkalut. Yksityishenkilölle ilmoittaminen on ilmaista.",
          bullets: [
            "Ei liity tarjouspyyntöön — erillinen tori",
            "Sopii remontin lomassa tai kun myyt vanhan laitteen",
            "Yhteystiedot näkyvät julkaisun jälkeen",
          ],
          href: "/markkinapaikka",
          cta: "Selaa toria",
          accent: "stone" as const,
        },
      ]
    : []),
];
