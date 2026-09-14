export type PlatformFeeWaiverReason =
  | "subscription"
  | "beta"
  | "referral"
  | "customer_referral";

export type PlatformFeeResolution = {
  feeCents: number;
  waiverReason: PlatformFeeWaiverReason | null;
};

export function platformFeeWaiverShortLabel(
  reason: PlatformFeeWaiverReason | null | undefined,
): string {
  switch (reason) {
    case "subscription":
      return "Kuukausitilaus — ei per-diili -maksua";
    case "beta":
      return "Beta-etu — ei välitysmaksua";
    case "referral":
      return "Urakoitsijan suositteluhyvitys — ei välitysmaksua";
    case "customer_referral":
      return "Asiakkaan suosittelubonus — ei välityslaskua";
    default:
      return "Ei välitysmaksua";
  }
}

export function platformFeeWaiverContractorMessage(
  reason: PlatformFeeWaiverReason | null | undefined,
): string {
  switch (reason) {
    case "subscription":
      return "Kuukausitilaus — ei välityspalkkiota. Asiakkaan yhteystiedot ovat nyt näkyvissä.";
    case "beta":
      return "Beta-etu: ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
    case "referral":
      return "Urakoitsijan suositteluhyvitys: ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
    case "customer_referral":
      return "Asiakkaan suosittelubonus: ei välityslaskua — vähennä bonuksen verran urakan hinnasta asiakkaan laskulla.";
    default:
      return "Ei välityspalkkiota — asiakkaan yhteystiedot ovat nyt näkyvissä.";
  }
}

export function customerReferralDiscountNotice(amountCents: number): string {
  const euros = new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
  return `Sinulla on suosittelubonus — jos valittu urakoitsija ei käytä omaa ilmaista etuaan (beta, tilaus tai urakoitsijan suositteluhyvitys), urakoitsija vähentää ${euros} (veroton) urakkasi hinnasta eikä saa välityslaskua tälle diilille.`;
}

export function customerReferralBonusUnusedNotice(): string {
  return "Sinulla on suosittelubonus, mutta tämä urakoitsija käyttää oman ilmaisen etunsa tällä diilillä. Valitessasi hänet bonuksesi jää tällä kertaa käyttämättä — voit käyttää sen seuraavassa urakassa, jossa urakoitsija ei käytä ilmaista etua.";
}
