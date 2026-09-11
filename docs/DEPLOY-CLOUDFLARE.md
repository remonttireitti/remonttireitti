# Tuotantodeploy — Cloudflare Workers

**remonttireitti.fi pyörii Cloudflare Workersissa.** Vercel-projekti on poistettu reposta — poista vanha projekti myös Vercel-dashboardista: [REMOVE-VERCEL.md](./REMOVE-VERCEL.md).

Deploy tapahtuu automaattisesti kun `main`-haaraan pushataan, tai manuaalisesti GitHub Actionsista.

---

## Miksi deploy voi epäonnistua?

Yleisin syy: **`CLOUDFLARE_API_TOKEN` on vanhentunut tai poistettu** GitHub Secretsistä.

Virhe lokissa näyttää tältä:
```
Authentication error [code: 10000]
Max auth failures reached [code: 9109]
```

Tämä **ei liity** sivuston käyttäjien kirjautumiseen (Supabase) — vain deploy-autentikointiin.

---

## Korjaus: uusi API-token (5 min)

Et tarvitse Wrangler-kirjautumista joka kerta. Riittää kertaluontoinen token GitHubiin.

### 1. Cloudflare-dashboard

1. Kirjaudu: https://dash.cloudflare.com/login  
   (Jos ei onnistu: salasanan reset / oikea sähköposti jolla domain on rekisteröity.)
2. Valitse oikea tili (account ID: `55f0f092b0cebaf0e3796f4d9bd89c56`).
3. **My Profile → API Tokens → Create Token**
4. Käytä pohjana **Edit Cloudflare Workers** tai luo custom token:

| Oikeus | Resurssi |
|--------|----------|
| Account → Workers Scripts | Edit |
| Account → Workers Routes | Edit |
| Account → Account Settings | Read |
| Zone → Workers Routes | Edit (zone: remonttireitti.fi) |

5. Kopioi token (näytetään vain kerran).

### 2. GitHub Secrets

Repo: **remonttireitti/remonttireitti** → Settings → Secrets and variables → Actions

| Secret | Arvo |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | juuri luotu token |
| `CLOUDFLARE_ACCOUNT_ID` | `55f0f092b0cebaf0e3796f4d9bd89c56` |

Muut secretit (Supabase, Resend, CRON) pysyvät ennallaan.

### 3. Aja deploy uudelleen

GitHub → **Actions → Deploy to Cloudflare Workers → Run workflow** (branch: main)

tai tyhjä commit mainiin:
```bash
git commit --allow-empty -m "Trigger Cloudflare deploy"
git push origin main
```

Onnistunut deploy kestää ~1–2 min. Tarkista: https://remonttireitti.fi/tarjouspyynnot

---

## Vaihtoehto: deploy omalta koneelta

Jos GitHub Actions ei toimi, voit deployata paikallisesti:

```bash
npm ci
npx wrangler login          # avaa selaimen — kertaluontoinen OAuth
npm run deploy
```

Tarvitset `.env.local` / ympäristömuuttujat buildiin (`NEXT_PUBLIC_*`, Supabase jne.).

---

## Supabase-migraatio (erillinen deploysta)

Koodimuutokset jotka vaativat uusia tauluja/sarakkeita:

1. Supabase Dashboard → SQL Editor
2. Aja tiedosto: `supabase/migrations/20260615140000_platform_subscription.sql`

---

## Mikä on missä? (lyhyesti)

| Palvelu | Rooli |
|---------|--------|
| **Cloudflare Workers** | remonttireitti.fi — sovellus tuotannossa |
| **Supabase** | tietokanta + käyttäjien kirjautuminen |
| **Resend** | sähköpostit |
| **GitHub Actions** | cron-ajot + Cloudflare-deploy |
| **Vercel** | ❌ ei käytössä — poista dashboardista ([ohje](./REMOVE-VERCEL.md)) |
