# Älykoti — Supabase-käyttöönotto

## Tärkeää turvallisuudesta

- **Älä tallenna database-salasanaa** git-repositorioon tai chattiin
- Jos salasana on jaettu julkisesti, **vaihda se** heti:
  Supabase Dashboard → Project Settings → Database → Reset database password
- Web-sovellus käyttää **API-avaimia**, ei database-salasanaa

## 1. Hae projektin tiedot dashboardista

[supabase.com/dashboard](https://supabase.com/dashboard) → projekti **alykoti**

| Tarvitaan | Mistä |
|-----------|-------|
| **Project URL** | Settings → API → Project URL |
| **anon key** | Settings → API → anon public |
| **service_role key** | Settings → API → service_role (salaisuus!) |
| **Project ref** | Settings → General → Reference ID (URL:ssä `https://<ref>.supabase.co`) |

## 2. Linkitä CLI ja aja migraatiot

Projekti: `vgxjobyfbpzriofcbcis`  
URL: `https://vgxjobyfbpzriofcbcis.supabase.co`

Kirjaudu **samalle tilille** jolla loit alykoti-projektin:

```powershell
cd alykoti
npx supabase login
npx supabase link --project-ref vgxjobyfbpzriofcbcis
npx supabase db push
```

Tämä ajaa myös `20260615100000_hubs.sql` (controllers → hubs, ESP-NOW-skeema).

Jos CLI sanoo *"does not have the necessary privileges"*, tili ei vastaa
dashboard-tiliä — kirjaudu ulos (`npx supabase logout`) ja uudelleen oikealla
sähköpostilla, tai aja migraatio SQL-editorissa (alla).

## 3. Web-sovelluksen ympäristömuuttujat

```powershell
cd alykoti/web
copy .env.example .env.local
```

Täytä `.env.local` (tiedosto on .gitignoressa):

```env
NEXT_PUBLIC_SUPABASE_URL=https://vgxjobyfbpzriofcbcis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...   # Settings → API → service_role (secret)
```

`service_role` tarvitaan ESP32-synkkiin (`/api/device/sync`). Ilman sitä web
toimii, mutta laite ei saa komentoja.

Käynnistä:

```powershell
npm run dev
```

Avaa http://localhost:3001 → Luo tili → Lisää keskusyksikkö.

## 4. Firmware

Kun keskusyksikkö on luotu webistä (`/keskusyksikko`), kopioi `device_token`:

```powershell
cd alykoti/firmware/hub
copy secrets.yaml.example secrets.yaml
```

```yaml
device_auth: "Bearer <token>"
sync_url: "http://<pc-ip>:3001/api/device/sync"
```

ESP32 ei näe `localhost` — käytä tietokoneen LAN-IP:tä tai julkaistua URL:ia.

## 5. Tarkista että Remonttireitti on erillinen

```powershell
npx supabase projects list
```

Pitäisi näkyä **alykoti** erillisenä **Remonttireitti**-projektista.
Älykoti-migraatiot ovat vain `alykoti/supabase/migrations/` — ei koske
Remonttireitin tietokantaa.
