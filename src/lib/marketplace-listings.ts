import {
  parseListingProductCategory,
  type ListingProductCategory,
} from "@/lib/marketplace-categories";
import {
  CONSUMER_FREE_MAX_ACTIVE_LISTINGS,
  LISTING_DURATION_DAYS,
} from "@/lib/marketplace-pricing";

export { CONSUMER_FREE_MAX_ACTIVE_LISTINGS, LISTING_DURATION_DAYS };

export const PUMP_TYPE_OPTIONS = [
  { value: "ilmalampopumppu", label: "Ilmalämpöpumppu" },
  { value: "ilmavesilampopumppu", label: "Vesi-ilmalämpöpumppu" },
  { value: "maalampopumppu", label: "Maalämpöpumppu" },
  { value: "varaosa", label: "Varaosa / muu" },
] as const;

export type ListingFormInput = {
  product_category: ListingProductCategory;
  title: string;
  description: string;
  condition: "used" | "new";
  price_eur: number | null;
  municipality: string;
  postal_code: string;
  address_line: string;
  pump_type_slug: string;
  manufacturer: string;
  model: string;
  year_manufactured: number | null;
  contact_email: string;
  contact_phone: string;
};

export type ConsumerListingInput = ListingFormInput;

export function validateListingForm(input: ListingFormInput): string | null {
  if (input.title.trim().length < 3) {
    return "Otsikko: vähintään 3 merkkiä.";
  }
  if (input.description.trim().length < 10) {
    return "Kuvaus: vähintään 10 merkkiä.";
  }
  if (!/^\d{5}$/.test(input.postal_code.trim())) {
    return "Postinumero: 5 numeroa.";
  }
  if (!input.municipality.trim()) return "Anna kunta.";
  if (!input.contact_email.trim()) return "Anna sähköposti.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email.trim())) {
    return "Sähköposti on virheellinen.";
  }
  if (input.contact_phone.replace(/\D/g, "").length < 6) {
    return "Anna kelvollinen puhelinnumero.";
  }
  if (!input.product_category) return "Valitse tuoteryhmä.";
  return null;
}

export const validateConsumerListing = validateListingForm;

export function parseListingForm(formData: FormData): ListingFormInput {
  const priceRaw = String(formData.get("price_eur") ?? "").trim();
  const yearRaw = String(formData.get("year_manufactured") ?? "").trim();

  return {
    product_category: parseListingProductCategory(
      formData.get("product_category"),
    ),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    condition:
      String(formData.get("condition") ?? "used") === "new" ? "new" : "used",
    price_eur: priceRaw ? Number(priceRaw) : null,
    municipality: String(formData.get("municipality") ?? "").trim(),
    postal_code: String(formData.get("postal_code") ?? "").trim(),
    address_line: String(formData.get("address_line") ?? "").trim(),
    pump_type_slug: String(formData.get("pump_type_slug") ?? "").trim(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    year_manufactured: yearRaw ? Number(yearRaw) : null,
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
  };
}

export const parseConsumerListingForm = parseListingForm;
