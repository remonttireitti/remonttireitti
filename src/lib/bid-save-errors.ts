/** Käännä tarjouksen tallennusvirheet käyttäjälle luettavaksi. */
export function formatBidSaveError(error: {
  code?: string;
  message?: string;
}): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";

  if (code === "23505") {
    return "Olet jo jättänyt tarjouksen tähän pyyntöön.";
  }

  if (
    code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist"))
  ) {
    return "Tietokannassa puuttuu päivitys. Ylläpitäjän tulee ajaa migraatio 20260520150000_bid_warranty_terms.sql Supabasessa.";
  }

  if (code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "Ei oikeutta tallentaa tarjousta. Kirjaudu sisään uudelleen ja yritä.";
  }

  if (process.env.NODE_ENV === "development" && msg) {
    return `Tarjouksen tallennus epäonnistui: ${msg}`;
  }

  return "Tarjouksen tallennus epäonnistui. Yritä uudelleen.";
}
