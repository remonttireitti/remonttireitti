import type { HeatPumpSlug } from "@/constants/heat-pumps";
import { DEVICE_CATEGORIES } from "@/constants/maintenance";

const PUMP_TO_INSTALL_JOB: Record<string, string> = {
  ilmalampopumppu: "lampopumppu-ilma",
  ilmavesilampopumppu: "lampopumppu-ilmavesi",
  maalampopumppu: "maalampopumppu",
};

export type ListingInstallSource = {
  id: string;
  title: string;
  manufacturer: string | null;
  model: string | null;
  pump_type_slug: string | null;
  product_category: string | null;
  municipality: string;
  postal_code: string;
  price_eur: number | null;
};

export function buildListingInstallHref(listing: ListingInstallSource): string | null {
  if (listing.product_category !== "device") return null;

  const parts = [
    `Ostan/mietin laitetta torilta: "${listing.title}".`,
    listing.manufacturer || listing.model
      ? `Laite: ${[listing.manufacturer, listing.model].filter(Boolean).join(" ")}.`
      : null,
    listing.price_eur != null
      ? `Hinta ilmoituksessa: ${listing.price_eur} €.`
      : "Hinta neuvoteltavissa.",
    `Ilmoitus: /markkinapaikka/ilmoitukset/${listing.id}.`,
    "Tarvitsen asennuksen/käyttöönoton — pyydän tarjouksia.",
  ].filter(Boolean);

  const pumpSlug = listing.pump_type_slug?.trim();
  const installJob =
    pumpSlug && PUMP_TO_INSTALL_JOB[pumpSlug]
      ? PUMP_TO_INSTALL_JOB[pumpSlug]
      : null;

  const q = new URLSearchParams();
  q.set("kuvaus", parts.join(" "));
  q.set("kunta", listing.municipality);
  q.set("postinumero", listing.postal_code);
  q.set("listing_id", listing.id);

  if (installJob) {
    q.set("tyyppi", installJob);
    return `/remontti/uusi?${q.toString()}`;
  }

  const deviceLabel = DEVICE_CATEGORIES.find((d) => d.value === pumpSlug)?.label;
  if (deviceLabel) {
    q.set("kuvaus", `${deviceLabel}. ${parts.join(" ")}`);
  }

  return `/remontti/uusi?${q.toString()}`;
}

export function isListingInstallEligible(listing: ListingInstallSource): boolean {
  return listing.product_category === "device";
}
