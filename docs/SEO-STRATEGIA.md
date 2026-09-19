# SEO-strategia — Remonttireitti.fi

Miksi Google-tulokset ovat heikot juuri nyt, ja mitä tehdä.

---

## Miksi tulokset ovat surkeat (rehellinen arvio)

### 1. Sivusto ei ole vielä Googlessa kunnolla

`site:remonttireitti.fi` palauttaa käytännössä tyhjää → sivuja ei ole indeksoitu tai domain on liian uusi. **Tekninen SEO ei auta, jos Google ei tiedä sivustosta.**

**Tehtävä nyt:**
1. [Google Search Console](https://search.google.com/search-console) → lisää `remonttireitti.fi`
2. Vahvista domain (DNS TXT tai HTML-tag → `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` GitHub Secrets / Cloudflare build)
3. Lähetä sitemap: `https://remonttireitti.fi/sitemap.xml`
4. Pyydä indeksointia tärkeimmille sivuille (Etusivu, `/apu`, `/vian-selvitys`, `/palvelut/ilmalampopumppu`)

**Kun sivustoa päivitetään (esim. uusi osio):**
- Search Console → **Sitemaps** → lähetä uudelleen `https://remonttireitti.fi/sitemap.xml`
- **URL-tarkistus** → *Pyydä indeksointia* vain muuttuneille tai uusille URL:ille (ei koko sivustoa)
- Prioriteetti deployn jälkeen: `/`, `/apu`, `/vian-selvitys`, 2–3 palvelusivua

### 2. Urakkamaailma voittaa verkostolla — ei tekniikalla

Heillä on:
- 10 000+ yritystä, 25 000+ arvostelua
- Vuosia indeksoitua sisältöä
- Kaupunki × palvelu -sivuja (`remontti Helsinki` jne.)

Sinulla on:
- Muutama tarjouspyyntö
- Hyvä tekninen pohja
- **Ainoa todella erilainen sisältö:** lämpöpumpun vian selvitys + vastatarjous

**Et voita "remontti" -sanalla vielä.** Voitat kapeilla kyselyillä ensin.

### 3. Palvelusivut ovat ohuita

`/palvelut/[slug]` × 48 on sama lyhyt pohja. Google suosii syvää, paikallista sisältöä.

---

## Missä kilpailla ensin (90 päivää)

| Prioriteetti | Sisältö | Esimerkkihaku |
|---|---|---|
| 1 | `/vian-selvitys/*` | lämpöpumppu ei lämmitä, virhekoodi |
| 2 | `/laskurit/kylpyhuoneremontti` | kylpyhuoneremontti hinta, vesieristys hinta |
| 3 | Lämpöpumpun palvelusivut | ilmalämpöpumpun asennus, huolto |
| 4 | Avoimet tarjouspyynnöt | kattoremontti Espoo (kun niitä on) |
| 5 | `/apu` | naapuriapu, pieni apu (kapea, matala volyymi) |
| 6 | FB + paikalliset ryhmät | ei SEO, mutta tuo ensimmäiset pyynnöt |

**Myöhemmin (kun liikennettä):** kaupunki-sivut (`/palvelut/kattoremontti/helsinki`).

---

## Mitä koodissa on jo tehty

- Keskitetty metadata (`src/lib/seo.ts`, `seo-pages.ts`)
- `sitemap.xml` (~90+ URL + avoimet tarjouspyynnöt + `/apu` + avoimet apupyynnöt)
- `HELP_KEYWORDS` + `/apu` metadata (`src/lib/seo-keywords.ts`, `seo-pages.ts`)
- `public/llms.txt` — Apu mukana LLM-hakemistossa
- `robots.txt` — yksityiset alueet estetty
- JSON-LD: Organization, WebSite, HowTo + FAQ vian selvityksessä
- Breadcrumb-rakenne vian selvityksessä
- Hakukoneystävälliset otsikot oire-sivuille
- Tori piilotettu sitemapista (tyhjä marketplace ei hidasta)

- Preferoidut SEO-URL:t laskureille (`kylpyhuoneremontti`, `kattoremontti`, …) + 301 kylmistä slugista
- Sitemap listaa yhden URL:n per laskuri (ei alias-duplikaatteja)
- FAQPage-schema vain kun FAQ-sisältö on olemassa
- Prioriteettipalveluiden metadata (ILP, kylpyhuone, katto, keittiö, huolto/korjaus)
- Sisälinkit: `/laskurit` ↔ `/palvelut` ↔ `/vian-selvitys`, palvelusivut → laskurit
- robots.txt: `/apu/omat`, `/tarjousarvio/omat`, `/tarjouslaskuri`, `/arvioija`
- noindex yksityisille näkymille (omat-sivut, tarjouslaskuri, arvioija)
- H1/title -linjaus etusivulla + prioriteettilaskurien otsikot (hinta-haut)

---

## Sinun tehtävälista (ei koodia)

### Viikko 1
- [ ] Google Search Console + sitemap
- [ ] Google Analytics (`NEXT_PUBLIC_GA_MEASUREMENT_ID` buildiin)
- [ ] 3 FB-postia lämpöpumpusta → linkki `/vian-selvitys`
- [ ] Pyydä 2–3 urakoitsijaa linkittämään profiiliinsa (backlink)

### Viikko 2–4
- [ ] Kirjoita 2 "syvää" artikkelia (blogi tai `/palvelut`-laajennus):
  - "Ilmalämpöpumppu ei lämmitä talvella — 7 syytä"
  - "Kattoremontin hinta 2026 — mitä vaikuttaa"
- [ ] Jokainen valmis urakka → pyydä arvostelu (sisältö + luottamus)
- [ ] Paikalliset hakemistot (Finder, 118.fi tms.) — yrityslinkki

### Mittaa Search Consolesta
- Indeksoidut sivut (tavoite: 50+ 30 pv:ssä)
- Impressiot `/vian-selvitys`-poluille
- CTR ja keskimääräinen sijoitus top-10 kyselyille

---

## Mitä EI kannata tehdä nyt

- ❌ Google Ads laajalle "remontti" -sanalle (kallis, Urakkamaailma voittaa)
- ❌ 200 kaupunkisivua tyhjällä sisällöllä
- ❌ Copy-paste sisältö kilpailijoilta

---

## Yhteenveto

Surkeat tulokset eivät johdu siitä, että "SEO olisi unohdettu" — vaan siitä, että **Google ei vielä luota uuteen domainiin** eikä sisältömäärä riitä kilpailijoihin. Remonttireitin paras polku on **lämpöpumpun vian selvitys → huoltopyyntö → tarjouspyynnöt**, ei yleinen "kilpailuta remontti".

Kun ensimmäiset 100 tarjouspyyntöä ja arvostelut tulevat, SEO alkaa kantaa itseään.
