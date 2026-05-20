/** Asiakkaalle näytettävä luottamus- ja pätevyysteksti (rehellinen kuvaus). */

export const CONTRACTOR_TRUST_POINTS = [
  {
    title: "Pätevyydet ilmoitettu",
    body: "Urakoitsija kertoo rekisteröityessä kylmäaineluvan, sähkö- ja LVI-työn sekä asentamansa pumpputyypit.",
  },
  {
    title: "Tarjouksessa vahvistus",
    body: "Tarjouksessa urakoitsija vahvistaa tarvittavat luvat ja rakennusvaatimukset ennen kuin valitset hänet.",
  },
  {
    title: "Arvostelut näkyvät",
    body: "Valmiiden urakoiden jälkeen asiakkaat voivat arvostella — keskiarvo näkyy tarjousvertailussa.",
  },
  {
    title: "Muistutus palautteesta",
    body: "Kun urakka on valmis, saat noin viikon kuluttua muistutuksen kertoa miten asennus sujui.",
  },
] as const;

export const REVIEW_REMINDER_DAYS = 7;
