export type NavAudience = "customer" | "contractor";

const CUSTOMER_PREFIXES = [
  "/remontti",
  "/asiakkaalle",
  "/tarjousarvio",
  "/tarjouspyynnot",
  "/huolto/uusi",
  "/vian-selvitys",
  "/oma-tili/huoltokirja",
  "/markkinapaikka/ilmoita",
] as const;

const CONTRACTOR_PREFIXES = ["/urakoitsijaksi", "/tarjoukset"] as const;

function normalizePath(href: string): string {
  const withoutHash = href.split("#")[0] ?? href;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Palauttaa kohdeyleisön vain selkeille asiakas-/urakoitsija-oikoteille. */
export function getPathAudience(href: string): NavAudience | null {
  const pathname = normalizePath(href);

  if (pathname.endsWith(".xml")) return null;

  for (const prefix of CUSTOMER_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return "customer";
  }

  for (const prefix of CONTRACTOR_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return "contractor";
  }

  return null;
}

export function isCrossRoleNavigation(
  href: string,
  opts: { loggedIn: boolean; isCustomer: boolean; isContractor: boolean },
): boolean {
  if (!opts.loggedIn) return false;

  const audience = getPathAudience(href);
  if (!audience) return false;

  if (opts.isContractor && audience === "customer") return true;
  if (opts.isCustomer && audience === "contractor") return true;

  return false;
}
