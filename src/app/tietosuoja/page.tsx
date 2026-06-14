import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { siteConfig } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tietosuojaseloste",
  description: "Remonttireitin tietosuojaseloste ja evästekäytäntö.",
  path: "/tietosuoja",
});

const UPDATED = "19.5.2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Tietosuojaseloste" updated={UPDATED}>
      <p>
        Tämä seloste kuvaa, miten {siteConfig.legalName} (&quot;
        {siteConfig.name}&quot;, &quot;me&quot;) käsittelee henkilötietoja, kun
        käytät verkkopalvelua osoitteessa {siteConfig.siteUrl}.
      </p>

      <LegalSection title="1. Rekisterinpitäjä">
        <p>
          <strong>{siteConfig.legalName}</strong>
          {siteConfig.businessId && (
            <>
              <br />
              Y-tunnus: {siteConfig.businessId}
            </>
          )}
          {siteConfig.address && (
            <>
              <br />
              {siteConfig.address}
            </>
          )}
          <br />
          Sähköposti:{" "}
          <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. Käsittelyn tarkoitukset">
        <ul className="list-disc space-y-1 pl-5">
          <li>Käyttäjätilien luonti ja kirjautuminen</li>
          <li>Lämpöpumppujen tarjouspyyntöjen ja tarjousten välittäminen</li>
          <li>Markkinapaikan ilmoitusten julkaisu ja viestintä</li>
          <li>Laskutus ja maksujen hallinta (manuaalinen laskutus)</li>
          <li>Asiakaspalvelu ja palvelun kehittäminen</li>
          <li>Lakisääteiset velvoitteet</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Käsiteltävät tiedot">
        <p>Voimme käsitellä esimerkiksi:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nimi, sähköposti, puhelinnumero</li>
          <li>Yritystiedot (urakoitsijat)</li>
          <li>Osoite- ja kohdetiedot remonttipyynnöissä</li>
          <li>Tarjousten sisältö, viestit ja arvostelut</li>
          <li>{marketplaceBrand.name}-ilmoitusten tiedot ja yhteystiedot</li>
          <li>Tek tekniset lokitiedot (IP-osoite, selain, aikaleima)</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Oikeusperusteet (GDPR)">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Sopimus</strong> — palvelun tarjoaminen rekisteröityneelle
            käyttäjälle
          </li>
          <li>
            <strong>Oikeutettu etu</strong> — palvelun turvallisuus, väärinkäytösten
            esto, analytiikka (suostumuksella)
          </li>
          <li>
            <strong>Suostumus</strong> — ei-välttämättömät evästeet ja analytiikka
          </li>
          <li>
            <strong>Lakisääteinen velvoite</strong> — kirjanpito ja viranomaisten
            pyynnöt
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Tietojen säilytys">
        <p>
          Säilytämme tietoja niin kauan kuin tili on aktiivinen tai palvelun
          kannalta tarpeen. Tarjouspyynnöt, tarjoukset ja viestit säilyvät
          urakan ajan ja kohtuullisen ajan sen jälkeen. Voit pyytää poistoa,
          jos käsittelyyn ei ole muuta perustetta.
        </p>
      </LegalSection>

      <LegalSection title="6. Luovutukset ja käsittelijät">
        <p>Käytämme luotettavia alihankkijoita, kuten:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase (tietokanta, autentikointi) — EU-alue</li>
          <li>Vercel (sovelluksen hosting)</li>
          <li>Resend (sähköposti-ilmoitukset)</li>
          <li>Google Analytics (vain suostumuksella, ks. evästeet)</li>
        </ul>
        <p>
          Emme myy henkilötietojasi kolmansille osapuolille markkinointitarkoituksiin.
        </p>
      </LegalSection>

      <LegalSection title="7. Oikeutesi">
        <p>Sinulla on oikeus:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>tarkastaa, oikaista ja poistaa tietojasi</li>
          <li>rajoittaa käsittelyä ja vastustaa käsittelyä</li>
          <li>siirtää tiedot järjestelmästä toiseen (soveltuvin osin)</li>
          <li>peruuttaa suostumus (evästeet)</li>
          <li>tehdä valitus valvontaviranomaiselle (Tietosuojavaltuutettu)</li>
        </ul>
      </LegalSection>

      <LegalSection id="evasteet" title="8. Evästeet">
        <p>
          <strong>Välttämättömät evästeet</strong> mahdollistavat kirjautumisen ja
          palvelun perustoiminnot. Niitä ei voi poistaa käytöstä palvelun käytön aikana.
        </p>
        <p>
          <strong>Anonyymi kävijätilasto</strong> tallentaa sivulataukset ja
          anonymisoidun kävijätunnisteen (ei nimeä, sähköpostia eikä IP-osoitetta)
          palvelun kehittämiseksi. Tilastointi toimii ilman rekisteröitymistä.
        </p>
        <p>
          <strong>Analytiikkaevästeet</strong> (esim. Google Analytics) asetetaan vain,
          jos hyväksyt ne evästebannerissa. Voit perua suostumuksen tyhjentämällä
          evästeet selaimesta tai hylkäämällä analytiikan bannerissa.
        </p>
        <p>
          Lisätietoja:{" "}
          <a
            href="https://policies.google.com/privacy"
            className="text-sky-700 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Googlen tietosuojakäytäntö
          </a>
        </p>
      </LegalSection>

      <LegalSection title="9. Tietoturva">
        <p>
          Suojaamme tietoja salatulla yhteydellä (HTTPS), käyttöoikeuksilla ja
          palveluntarjoajien tietoturvakäytännöillä. Yhteystiedot urakoitsijoille
          voidaan avata vasta välitysmaksun jälkeen tarjouskilpailussa.
        </p>
      </LegalSection>

      <LegalSection title="10. Muutokset">
        <p>
          Voimme päivittää tätä selostetta. Merkittävistä muutoksista ilmoitetaan
          palvelussa tai sähköpostitse.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
