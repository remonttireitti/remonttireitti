/** Käännä Supabase/Postgres-virheet käyttäjälle luettavaksi. */
export function formatProjectSaveError(error: {
  code?: string;
  message?: string;
  details?: string;
}): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";

  if (code === "23503") {
    if (msg.includes("profiles") || msg.includes("customer_id")) {
      return "Käyttäjäprofiili puuttuu. Kirjaudu ulos ja sisään uudelleen, sitten yritä tallentaa.";
    }
    if (msg.includes("job_type")) {
      return "Lämpöpumpun tyyppi on virheellinen. Valitse tyyppi uudelleen alusta.";
    }
    if (msg.includes("category")) {
      return "Kategoria puuttuu. Päivitä sivu ja täytä lomake uudelleen.";
    }
    return "Tallennus epäonnistui viitevirheen vuoksi. Tarkista valinnat ja yritä uudelleen.";
  }

  if (code === "23505") {
    return "Tallennus epäonnistui: tietue on jo olemassa.";
  }

  if (code === "42703" || msg.includes("column") && msg.includes("does not exist")) {
    return "Tietokannassa puuttuu päivitys. Ylläpitäjän tulee ajaa Supabase-migraatiot (db push).";
  }

  if (
    code === "42P17" ||
    msg.toLowerCase().includes("infinite recursion")
  ) {
    return "Tietokannan käyttöoikeusasetuksissa on virhe. Ylläpitäjän tulee ajaa migraatio 20260520120000_fix_projects_rls_recursion.sql (supabase db push).";
  }

  if (code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "Ei oikeutta tallentaa. Kirjaudu sisään uudelleen ja yritä.";
  }

  if (process.env.NODE_ENV === "development" && msg) {
    return `Tallennus epäonnistui: ${msg}`;
  }

  return "Tallennus epäonnistui. Yritä uudelleen.";
}
