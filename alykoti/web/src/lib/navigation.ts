export type NavSection = {
  id: string;
  label: string;
  href: string;
  description: string;
  enabled: boolean;
};

export const DASHBOARD_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Koti",
    href: "/",
    description: "Yleiskatsaus",
    enabled: true,
  },
  {
    id: "hub",
    label: "Keskusyksikkö",
    href: "/keskusyksikko",
    description: "Laite, yhteys ja ESP-NOW",
    enabled: true,
  },
  {
    id: "ventilation",
    label: "Ilmanvaihto",
    href: "/ilmanvaihto",
    description: "CO₂, tuuletus ja AirFi",
    enabled: true,
  },
  {
    id: "heating",
    label: "Lämmitys",
    href: "/lammitys",
    description: "Tulossa",
    enabled: false,
  },
  {
    id: "lighting",
    label: "Valaistus",
    href: "/valaistus",
    description: "Tulossa",
    enabled: false,
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
