# Remonttireitti

Remonttivälityspalvelu — selkeä polku useisiin tarjouksiin (Urakkamaailma-tyyppinen, paremmin mallinnettu).

**Stack:** Next.js · Supabase (PostgreSQL, Auth, Storage) · TypeScript · Tailwind

## Projektikansio

```
C:\Users\Administrator\projects\remonttivalitys
```

> Voit nimetä kansion uudelleen `remonttireitti`-nimiseksi, kun mikään editori ei pidä sitä auki.

## Supabase-projektin perustaminen

### 1. Luo pilviprojekti

1. Mene [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → nimeksi esim. `remonttireitti`
3. Valitse alue **EU (Frankfurt)** (GDPR)
4. Kopioi **Project URL** ja **anon key**

### 2. Ympäristömuuttujat

```powershell
copy .env.example .env.local
```

Täytä `.env.local` dashboardin API-arvoilla.

### Sähköposti-ilmoitukset (Resend)

Ilmoitukset lähetetään [Resend](https://resend.com)-palvelulla. Ilman avainta vain sovellusilmoitukset toimivat.

**Vercel → Environment Variables:**

| Muuttuja | Esimerkki |
|----------|-----------|
| `RESEND_API_KEY` | `re_…` (Resend API Keys) |
| `EMAIL_FROM` | `Remonttireitti <noreply@remonttireitti.fi>` |
| `NEXT_PUBLIC_SITE_URL` | `https://remonttireitti.fi` |
| `ADMIN_NOTIFY_EMAIL` | (valinnainen) ylimääräinen vastaanottaja uusista rekisteröitymisistä |
| `PLATFORM_FEE_BETA_FREE_DEALS` | Oletus `3` — ensimmäiset N hyväksyttyä diiliä ilman palkkiota. Poista: `0` |

Vahvista lähettäjädomain Resendissä (DNS-tietueet). Kehityksessä Resend voi lähettää vain vahvistettuihin osoitteisiin.

### Tuotanto: Cloudflare Workers (OpenNext)

Sovellus ajetaan [Cloudflare Workers](https://developers.cloudflare.com/workers/)-alustalla `@opennextjs/cloudflare` -adapterilla.

**Paikallinen esikatselu:**

```powershell
copy .dev.vars.example .dev.vars
# täytä .dev.vars
npm run preview
```

**Deploy:**

```powershell
# Build lukee .env.local / ympäristömuuttujat (NEXT_PUBLIC_*)
npm run deploy
```

**Salaisuudet tuotantoon** (Wrangler):

```powershell
npx wrangler secret bulk .env.production.secrets
```

Tiedostoon vain server-side avaimet (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, …). `NEXT_PUBLIC_*` tulee buildin aikana.

**Domain:** `wrangler.jsonc` reitittää `remonttireitti.fi` → worker. Vaihda domainin nameserverit Cloudflareen ja kopioi DNS-tietueet (MX, Resend DKIM, Google verification).

**Cron-ajot:** Vercel-cronin korvasi GitHub Actions (`.github/workflows/cron.yml`). Aseta repoon `CRON_SECRET` (secret) ja `SITE_URL=https://remonttireitti.fi` (variable).

### 3. Aja tietokantamigraatio

**Vaihtoehto A — Supabase Dashboard**

- Avaa **SQL Editor**
- Kopioi ja aja `supabase/migrations/20260519100000_initial_schema.sql`

**Vaihtoehto B — CLI (vaatii kirjautumisen)**

```powershell
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

### 4. Käynnistä sovellus

```powershell
npm run dev
```

Avaa [http://localhost:3000](http://localhost:3000)

## Tietomalli (lyhyesti)

| Taulu | Kuvaus |
|-------|--------|
| `profiles` | Käyttäjät (asiakas / urakoitsija / admin) |
| `contractor_profiles` | Yritystiedot, vahvistus |
| `service_categories` | Remonttityypit (keittiö, kylpyhuone…) |
| `projects` | Remonttipyynnöt, tilakone |
| `bids` | Urakoitsijoiden tarjoukset |
| `conversations` / `messages` | Viestintä |
| `reviews` | Arvostelut valmistuneista töistä |

## Auth (vaihe 1)

- Rekisteröidy: `/rekisteroidy` (asiakas tai urakoitsija)
- Kirjaudu: `/kirjaudu`
- Oma tili: `/oma-tili`
- Aja myös migraatio: `supabase/migrations/20260519110000_auth_roles.sql`

**Supabase Dashboard:** Authentication → Providers → Email → voit poistaa "Confirm email" kehityksessä nopeampaa testausta varten.

## Vaihe 3 — Tarjoukset

- Urakoitsija: `/tarjoukset` → valitse pyyntö → jätä tarjous
- Asiakas: `/remontti/[id]` → vertaile tarjouksia → hyväksy
- Aja migraatio: `supabase/migrations/20260519120000_bids_policies.sql`

## Seuraavat askeleet

- [x] Auth (sähköposti + salasana, roolit)
- [x] Remonttipyynnön wizard (`/remontti/uusi`)
- [x] Tarjousten jättö ja hyväksyntä
- [ ] Viestintä (vaihe 4)
- [ ] Admin: urakoitsijoiden vahvistus
