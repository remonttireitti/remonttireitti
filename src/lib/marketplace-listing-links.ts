/** Polku uuden ilmoituksen luontiin — urakoitsija vs yksityishenkilö. */
export function marketplaceCreateListingPath(isContractor: boolean): string {
  return isContractor
    ? "/markkinapaikka/ilmoita"
    : "/markkinapaikka/ilmoita?tyyppi=kuluttaja";
}
