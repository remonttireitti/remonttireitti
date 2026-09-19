export type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
};

/** Etusivun FAQ — tiivis, FAQPage-schema. */
export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    id: "tili-tarpeen",
    question: "Pitääkö luoda tili tarjouspyyntöä varten?",
    answer:
      "Ei. Voit täyttää ja lähettää tarjouspyynnön ilman rekisteröitymistä — vahvistat julkaisun sähköpostiin tulevalla linkillä. Tili on valinnainen: se helpottaa viestittelyä urakoitsijoiden kanssa ennen valintaa. Pieni apu -palvelu vaatii kirjautumisen luottamuksen vuoksi.",
  },
  {
    id: "maksaa-ko",
    question: "Maksaako palvelu minulle?",
    answer:
      "Ei. Tarjouspyyntö, vertailu ja vastatarjoukset ovat ilmaisia. Maksat vain valitsemallesi urakoitsijalle.",
  },
  {
    id: "vastatarjous",
    question: "Voiko hinnasta neuvotella?",
    answer:
      "Kyllä — ehdota alempaa vastatarjouksella. Urakoitsija hyväksyy tai hylkää sen alustalla.",
  },
  {
    id: "ohjattu-pyynto",
    question: "Mikä on ohjattu tarjouspyyntö?",
    answer:
      "Vaiheittainen ohje auttaa kuvaamaan työn, kohteen ja aikataulun. Laatupiste näyttää mitä vielä kannattaa täydentää — ja pohja oppii työlajeittain urakoitsijoiden palautteesta.",
  },
  {
    id: "halvin-paras",
    question: "Onko halvin tarjous aina paras?",
    answer:
      "Ei. Vertaa laajuutta, materiaaleja ja takuuta. Voit myös tingata vastatarjouksella.",
  },
  {
    id: "lampopumppu",
    question: "Lämpöpumppu oireilee?",
    answer:
      "Kokeile ilmaista vian selvitystä. Tarvittaessa kilpailuta huolto samalla palvelulla.",
  },
];
