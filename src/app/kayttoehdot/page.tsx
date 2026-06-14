import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Käyttöehdot",
  description: "Remonttireitin palvelun käyttöehdot.",
  path: "/kayttoehdot",
});

const UPDATED = "14.6.2026";

export default function TermsPage() {
  return (
    <LegalPage title="Käyttöehdot" updated={UPDATED}>
      <p>
        Nämä ehdot koskevat {siteConfig.name}-palvelun ({siteConfig.siteUrl})
        käyttöä. Rekisteröitymällä tai käyttämällä palvelua hyväksyt ehdot.
      </p>

      <LegalSection title="1. Palvelun kuvaus">
        <p>
          {siteConfig.legalName} tarjoaa välitysalustan, jossa omakotitaloudet voivat
          kilpailuttaa lämpöpumppuasennuksia ja käyttäjät voivat ostaa tai myydä
          laitteita markkinapaikalla. Emme ole urakoitsija emmekä myyjä — sopimus
          syntyy käyttäjien välillä.
        </p>
      </LegalSection>

      <LegalSection title="2. Käyttäjätyypit">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Asiakas</strong> — voi julkaista tarjouspyyntöjä ja hyväksyä
            tarjouksia
          </li>
          <li>
            <strong>Urakoitsija</strong> — voi jättää tarjouksia ja käyttää
            {marketplaceBrand.name.toLowerCase()}a maksullisilla paketeilla
          </li>
          <li>
            <strong>Yksityinen myyjä</strong> — voi julkaista rajoitetun määrän
            ilmaisia tori-ilmoituksia
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Tilin käyttö">
        <p>
          Olet vastuussa kirjautumistietojesi turvallisuudesta ja tililläsi
          tapahtuvasta toiminnasta. Ilmoita meille epäillystä väärinkäytöstä.
        </p>
      </LegalSection>

      <LegalSection title="4. Tarjouskilpailu">
        <ul className="list-disc space-y-1 pl-5">
          <li>Asiakkaan tarjouspyyntö on sitova vain hyväksytyn tarjouksen osalta.</li>
          <li>
            Hyväksynnän jälkeen urakoitsija maksaa välitysmaksun ennen kuin saa
            asiakkaan yhteystiedot.
          </li>
          <li>
            Emme takaa tarjousten määrää, hintaa tai urakan laatua emmekä sitä,
            että urakka toteutuu loppuun asti.
          </li>
          <li>
            Palvelumme tehtävä on tarjouskilpailun välittäminen ja tietojen
            toimittaminen osapuolille. Kun tarjous on hyväksytty ja välityspalkkio
            maksettu, palveluntarjoajan välitystehtävä on täytetty, vaikka urakka
            myöhemmin keskeytyisi, peruuntuisi tai epäonnistuisi.
          </li>
          <li>
            Asiakas on vastuussa tarjouspyynnön oikeellisuudesta ja riittävyydestä.
            Urakoitsija arvioi ennen tarjousta, voiko työn toteuttaa annettujen
            tietojen perusteella. Puutteelliset tiedot, piilevät vauriot tai muut
            odottamattomat olosuhteet eivät ole palveluntarjoajan vastuulla.
          </li>
          <li>
            Sopimus urakasta syntyy ainoastaan asiakkaan ja urakoitsijan välille.
            {siteConfig.name} ei ole urakoitsija eikä osapuoli työsopimuksessa.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={`5. ${marketplaceBrand.name} ja maksut`}>
        <ul className="list-disc space-y-1 pl-5">
          <li>Yksityishenkilön ilmoitukset ovat maksuttomia (rajoitettu määrä).</li>
          <li>Urakoitsijan ilmoitukset ja kk-paketit laskutetaan erikseen.</li>
          <li>Ilmoitukset vanhenevat ilmoitetun ajan jälkeen.</li>
          <li>
            Yritysasiakkaiden hinnat (tori, välityspalkkio) ovat verottomia; ALV
            lisätään laskulle.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Käyttäyssäännöt">
        <p>Kiellettyä on muun muassa:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>harhaanjohtavat tai lainvastaiset ilmoitukset</li>
          <li>toisten käyttäjien häirintä tai spämmi</li>
          <li>palvelun kiertäminen maksujen välttämiseksi</li>
          <li>haittaohjelmien levittäminen tai järjestelmän murtaminen</li>
        </ul>
        <p>Voimme poistaa sisältöä ja sulkea tilejä rikkomusten vuoksi.</p>
      </LegalSection>

      <LegalSection title="7. Vastuunrajoitus">
        <p>
          Palvelu tarjotaan &quot;kuten on&quot;. Emme vastaa välittömistä tai
          välillisistä vahingoista, jotka johtuvat käyttäjien välisistä sopimuksista,
          viiveistä, urakan keskeytymisestä tai kolmansien osapuolten palveluista.
        </p>
        <p>
          Erityisesti emme vastaa siitä, että hyväksytty urakka ei toteudu tai
          toteutuu puutteellisesti, jos syynä ovat muun muassa puutteelliset
          tarjouspyynnön tiedot, kohteen olosuhteet, osapuolten välinen sopimus tai
          force majeure. Välityspalkkio koskee onnistunutta yhteydenottoa ja
          tietojen välittämistä, ei urakan lopputulosta.
        </p>
        <p>Pakottava kuluttajansuoja säilyy.</p>
      </LegalSection>

      <LegalSection title="8. Immateriaalioikeudet">
        <p>
          Palvelun ulkoasu ja ohjelmisto kuuluvat meille. Julkaisemasi sisällön
          osalta annat meille rajoitetun oikeuden näyttää ja välittää sitä palvelussa.
        </p>
      </LegalSection>

      <LegalSection title="9. Sovellettava laki ja riidat">
        <p>
          Ehtoihin sovelletaan Suomen lakia. Riidat pyritään ratkaisemaan
          neuvottelemalla. Kuluttaja voi saattaa asian kuluttajariitalautakunnan
          käsiteltäväksi.
        </p>
      </LegalSection>

      <LegalSection title="10. Yhteystiedot">
        <p>
          {siteConfig.legalName}
          {siteConfig.businessId && ` · Y-tunnus ${siteConfig.businessId}`}
          <br />
          {siteConfig.address && (
            <>
              {siteConfig.address}
              <br />
            </>
          )}
          <a href={`mailto:${siteConfig.email}`} className="text-sky-700 hover:underline">
            {siteConfig.email}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
