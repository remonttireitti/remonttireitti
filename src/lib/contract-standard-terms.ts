/** Yhteiset urakkasopimuksen liite-ehdot (täydentää tarjouksen ehtoja). */

export type ContractStandardSection = {
  id: string;
  title: string;
  body: string;
};

export const CONTRACT_STANDARD_SECTIONS: ContractStandardSection[] = [
  {
    id: "formation",
    title: "Sopimuksen syntyminen",
    body:
      "Urakkasopimus syntyy asiakkaan ja urakoitsijan välille, kun asiakas hyväksyy urakoitsijan tarjouksen Remonttireitin kautta. Hyväksyntä on sähköinen toimenpide alustalla. Tämä yhteenveto dokumentoi hyväksytyn tarjouksen ehdot ja yhteiset liite-ehdot.",
  },
  {
    id: "scope",
    title: "Työn laajuus",
    body:
      "Työn laajuus määräytyy hyväksytyn tarjouksen mukaan sekä tarjouspyynnön kuvauksen perusteella. Tarjouspyynnön olennaiset tiedot ovat osa sopimusta. Urakoitsija arvioi työn toteutettavaksi annettujen tietojen perusteella.",
  },
  {
    id: "changes",
    title: "Muutokset ja lisätyöt",
    body:
      "Työn laajentuminen, lisätyöt tai olosuhteiden muutos (esim. piilevät vauriot) edellyttävät osapuolten erillistä sopimusta ennen työn jatkamista. Lisätyöt laskutetaan erikseen sovitulla tavalla, ellei tarjouksessa toisin mainita.",
  },
  {
    id: "payment",
    title: "Maksu ja viivästys",
    body:
      "Maksuehdot noudattavat tarjouksen sopimusehtoja. Ellei tarjouksessa toisin sovita, laskun maksuaika on 14 päivää netto. Viivästyskorko noudattaa kulloinkin voimassa olevaa korkolakia. Urakoitsija voi keskeyttää työn maksamattomien laskujen yhteydessä sovitun mukaisesti.",
  },
  {
    id: "delay",
    title: "Aikataulu ja viivästykset",
    body:
      "Työn aloitus ja kesto sovitaan tarjouksen ja osapuolten yhteisen aikataulun mukaan. Osapuolet ilmoittavat viivästyksistä ja niiden syistä viipymättä. Ylivoimainen este (force majeure) vapauttaa osapuolen suoritusvelvollisuudesta esteen keston ajaksi.",
  },
  {
    id: "warranty",
    title: "Takuu ja reklamaatiot",
    body:
      "Työn ja laitteiden takuuehdot määräytyvät tarjouksen mukaan. Reklamaatio tulee esittää kohtuullisessa ajassa havaittua virheestä. Osapuolet selvittävät reklamaation yhteistyössä ennen mahdollista korjausta tai hyvitystä.",
  },
  {
    id: "disputes",
    title: "Riidanratkaisu",
    body:
      "Sopimukseen sovelletaan Suomen lakia. Erimielisyydet pyritään ensisijaisesti ratkaisemaan neuvottelemalla. Kuluttaja-asiakkaalla on oikeus saattaa asia kuluttajariitalautakunnan käsiteltäväksi tai vireille käräjäoikeudessa.",
  },
  {
    id: "platform",
    title: "Remonttireitin rooli",
    body:
      "Remonttireitti toimii välittäjänä: se välittää tarjouspyynnön, tarjoukset ja yhteystiedot. Palvelu ei ole urakoitsija eikä osapuoli työsopimuksessa eikä vastaa urakan toteutumisesta, ellei pakottava lainsäädäntä toisin määrää.",
  },
];
