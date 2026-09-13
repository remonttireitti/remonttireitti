import { isMissingColumnError } from "@/lib/bid-save-persist";

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

  if (isMissingColumnError(error)) {
    return "Tietokannassa puuttuu päivitys. Aja Supabasessa: supabase/migrations/20260913190000_bid_trade_scope.sql (tai PRODUCTION_APPLY_20260913.sql).";
  }

  if (code === "42501" || msg.toLowerCase().includes("row-level security")) {
    return "Ei oikeutta tallentaa tarjousta. Kirjaudu sisään uudelleen ja yritä.";
  }

  if (code === "23502" && msg.includes("message")) {
    return "Kirjoita lyhyt viesti asiakkaalle tai täytä laajuuskentät.";
  }

  if (process.env.NODE_ENV === "development" && msg) {
    return `Tarjouksen tallennus epäonnistui: ${msg}`;
  }

  return "Tarjouksen tallennus epäonnistui. Yritä uudelleen.";
}
