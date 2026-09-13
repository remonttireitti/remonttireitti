export type HomeFaqItem = {
  id: string;
  question: string;
  answer: string;
};

/** Etusivun FAQ — vastaa yleisiin remontin kilpailutuskysymyksiin (FAQPage-schema). */
export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    id: "miten-kilpailuttaa",
    question: "Miten remontti kannattaa kilpailuttaa?",
    answer:
      "Kuvaile työn sisältö, kohde ja aikataulu samalla tavalla kaikille urakoitsijoille. Liitä kuvat ja budjetti-arvio. Vertaa tarjouksista hintaa, laajuutta, materiaaleja, takuuta ja aikataulua — pelkkä loppusumma ei riitä.",
  },
  {
    id: "maksaa-ko",
    question: "Maksaako remontin kilpailutus minulle?",
    answer:
      "Remonttireitissä tarjouspyynnön tekeminen, tarjousten vertailu ja vastatarjoukset ovat asiakkaalle ilmaisia. Maksat vain valitsemallesi urakoitsijalle sovitun työn hinnan.",
  },
  {
    id: "montako-tarjousta",
    question: "Kuinka monta remonttitarjousta kannattaa pyytää?",
    answer:
      "Tavoite on 2–4 vertailukelpoista tarjousta samoilla lähtötiedoilla. Olennaisempaa kuin suuri määrä on se, että tarjoukset tulevat kohteeseen ja alueeseen sopivilta urakoitsijoilta.",
  },
  {
    id: "halvin-paras",
    question: "Onko halvin remonttitarjous aina paras?",
    answer:
      "Ei välttämättä. Tarkista mitkä työt, materiaalit ja lisätyöt sisältyvät hintaan. Remonttireitissä voit ehdottaa alhaisempaa hintaa vastatarjouksella ennen hyväksyntää.",
  },
  {
    id: "vastatarjous",
    question: "Voiko remontin hinnasta neuvotella?",
    answer:
      "Kyllä. Jos tarjous tuntuu korkealta, voit ehdottaa omaa hintaa vastatarjouksella. Urakoitsija voi hyväksyä, hylätä tai jättää uuden tarjouksen — neuvottelu tapahtuu alustalla.",
  },
  {
    id: "lampopumppu",
    question: "Entä jos lämpöpumppu oireilee?",
    answer:
      "Aloita ilmaisella vian selvityksellä: valitse pumpputyyppi ja oire, saat tarkistuslistan. Jos vika jää, voit kilpailuttaa huollon samalla palvelulla.",
  },
];
