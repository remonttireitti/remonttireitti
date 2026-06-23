export type NavSection = {
  id: string;
  label: string;
  href: string;
  description: string;
  enabled: boolean;
  activeMatch?: (pathname: string) => boolean;
};

export const DASHBOARD_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Koti",
    href: "/",
    description: "Yleiskatsaus ja pohjakuva",
    enabled: true,
  },
  {
    id: "ventilation",
    label: "Ilmanvaihto",
    href: "/ilmanvaihto",
    description: "CO₂, tuuletus ja AirFi",
    enabled: true,
    activeMatch: (pathname) =>
      pathname === "/ilmanvaihto" ||
      (pathname.startsWith("/ilmanvaihto/") && !pathname.includes("/asetukset")),
  },
  {
    id: "heating",
    label: "Lämmitys",
    href: "/lammitys",
    description: "Lämmityksen ohjaus",
    enabled: true,
  },
  {
    id: "lights",
    label: "Valot",
    href: "/valot",
    description: "Valojen ohjaus",
    enabled: true,
    activeMatch: (pathname) => pathname === "/valot" || pathname.startsWith("/valot/"),
  },
  {
    id: "settings",
    label: "Asetukset",
    href: "/laitteet",
    description: "Integraatiot, laitteet ja automaatio",
    enabled: true,
    activeMatch: (pathname) =>
      pathname.startsWith("/laitteet") ||
      pathname.startsWith("/asetukset") ||
      pathname.includes("/ilmanvaihto/asetukset"),
  },
];

export function isNavActive(pathname: string, section: NavSection): boolean {
  if (!section.enabled) return false;
  if (section.activeMatch) return section.activeMatch(pathname);
  if (section.href === "/") return pathname === "/";
  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}
