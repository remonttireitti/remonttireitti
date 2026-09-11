# Vercel-projektin poisto (Remonttireitti)

Remonttireitti.fi pyörii **Cloudflare Workersissa**. Vercel-projekti on turha ja aiheuttaa punaisen CI-merkinnän GitHubissa.

Tämä repo ei enää sisällä juuren `vercel.json`-tiedostoa.

---

## 1. Poista projekti Vercel-dashboardista (2 min)

1. Kirjaudu: https://vercel.com/login  
2. Avaa **Remonttireitti**-projekti (tai vastaava nimi).  
3. **Settings → General → Delete Project**  
4. Vahvista projektin nimi.

> **Huom:** Älykoti (`alykoti/web`) on erillinen Vercel-projekti — **älä poista sitä**, jos käytät sitä edelleen.

---

## 2. Irrota GitHub-integraatio (punainen CI katoaa)

**Vaihtoehto A — GitHub**

1. https://github.com/remonttireitti/remonttireitti/settings/installations  
2. **Vercel** → Configure  
3. Poista `remonttireitti`-repo käytöstä tai Uninstall.

**Vaihtoehto B — Vercel**

1. Vercel → Account Settings → Git  
2. Disconnect GitHub tai poista repo linkityksestä.

---

## 3. (Valinnainen) CLI poisto tokenilla

Jos sinulla on Vercel API -token:

```bash
export VERCEL_TOKEN=your_token
npx vercel project rm remonttireitti --yes
```

Projektin tarkka nimi: tarkista Vercel-dashboardista (`vercel project ls`).

---

## Mitä jäi repoon?

| Kohde | Tila |
|-------|------|
| `vercel.json` (juuri) | Poistettu |
| `public/vercel.svg` | Poistettu |
| `alykoti/web/` | Oma Vercel-projekti — ei koskettu |
| Tuotanto | Cloudflare Workers — [DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md) |
