# Älykoti — deploy (Vercel)

Älykoti **ei** deployaudu Remonttireitti-sovellukseen. Molemmat ovat samassa git-repossa, mutta eri Vercel-projekteissa.

| Sovellus | Vercel-projekti | Root Directory | URL |
|----------|-----------------|----------------|-----|
| **Älykoti** | `alykoti` (tai vastaava) | `alykoti/web` | https://alykoti.vercel.app |
| Remonttireitti | `remonttireitti` | repo juuri `/` | https://remonttireitti.fi |

## Oikea deploy-polku

1. Push `main`-haaraan (kuten tavallisesti).
2. Vercel-projekti, jossa **Root Directory = `alykoti/web`**, buildaa ja julkaisee Älykodin.
3. Yellow synkkaa osoitteeseen `https://alykoti.vercel.app/api/device/sync`.

### CLI-deploy (älä koske Remonttireittiin)

Aja **repojuuresta**, aina `--project alykoti`:

```powershell
cd remonttivalitys
npx vercel deploy --prod --yes --project alykoti --archive=tgz
```

**Älä** aja `npx vercel deploy` ilman `--project alykoti` repojuuresta — se kohdistuu Remonttireitti-projektiin.

## Jos Remonttireitti buildaa turhaan

Repossa on myös `ignoreCommand` (Git-deploy):

- **Remonttireitti**: juuren `vercel.json` — ohita build, jos commitissa ei muutoksia `alykoti/`-ulkopuolella.
- **Älykoti**: `alykoti/web/vercel.json` — ohita build, jos commitissa ei muutoksia `alykoti/web/`-kansiossa (esim. vain Yellow).

Sama push voi käynnistää myös Remonttireitti-projektin, jos se on kytketty samaan repoon. Se **ei** sisällä Älykodin muutoksia buildissa (eri juurikansio), mutta build voi silti pyöriä.

Vercel → Remonttireitti-projekti → Settings → Git → **Ignored Build Step**:

```bash
git diff HEAD^ HEAD --quiet -- . ':(exclude)alykoti'
```

Exit 0 = ei muutoksia `alykoti/`-ulkopuolella → build ohitetaan. Muutokset vain `alykoti/`-kansiossa eivät enää käynnistä Remonttireittiä.

## Paikallinen testi

```powershell
cd alykoti/web
npm run dev
```

http://localhost:3001

## Yellow (Pi)

Web-deploy ei korvaa Yellowia. Firmware/Python:

```powershell
cd alykoti/yellow
python deploy_pi.py
```
