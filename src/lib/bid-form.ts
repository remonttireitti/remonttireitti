import { parseBidTermsFromFormData } from "@/lib/bid-terms";
import { bidTotalAmountCents } from "@/lib/bid-amounts";
import {
  parseBidOfferScope,
  type BidOfferScope,
} from "@/lib/bid-offer-scope";
import {
  isServicePricingModel,
  parseServicePricingFromScopeTerms,
  type ServicePricingModel,
} from "@/lib/service-engagement";

export type BidFormFields = {
  amount_euros: string;
  service_pricing_model: ServicePricingModel | "";
  offer_scope: BidOfferScope | "";
  offers_equipment: boolean;
  equipment_amount_euros: string;
  equipment_description: string;
  estimated_days: string;
  earliest_start_date: string;
  scope_terms: string;
  contract_terms: string;
  warranty_work: string;
  warranty_equipment: string;
  message: string;
  vat_included: boolean;
  confirms_licenses: boolean;
  confirms_building_standards: boolean;
};

export type BidFormFieldKey = keyof BidFormFields;

export type BidRecordForForm = {
  amount_cents: number;
  offers_equipment?: boolean | null;
  equipment_amount_cents?: number | null;
  equipment_description?: string | null;
  estimated_days: number | null;
  message: string;
  vat_included: boolean;
  scope_terms?: string | null;
  contract_terms?: string | null;
  warranty_work: string | null;
  warranty_equipment: string | null;
  earliest_start_date: string | null;
  confirms_licenses: boolean | null;
  confirms_building_standards: boolean | null;
  offer_scope?: string | null;
};

export function bidToFormFields(bid: BidRecordForForm): BidFormFields {
  const { model, rest } = parseServicePricingFromScopeTerms(
    bid.scope_terms ?? null,
  );

  return {
    amount_euros: String(Math.round(bid.amount_cents / 100)),
    service_pricing_model: model ?? "",
    offers_equipment: Boolean(bid.offers_equipment),
    equipment_amount_euros:
      bid.equipment_amount_cents != null
        ? String(Math.round(bid.equipment_amount_cents / 100))
        : "",
    equipment_description: bid.equipment_description ?? "",
    estimated_days:
      bid.estimated_days != null ? String(bid.estimated_days) : "",
    earliest_start_date: bid.earliest_start_date ?? "",
    offer_scope: parseBidOfferScope(bid.offer_scope) ?? "",
    scope_terms: rest,
    contract_terms: bid.contract_terms ?? "",
    warranty_work: bid.warranty_work ?? "",
    warranty_equipment: bid.warranty_equipment ?? "",
    message: bid.message,
    vat_included: bid.vat_included,
    confirms_licenses: bid.confirms_licenses ?? false,
    confirms_building_standards: bid.confirms_building_standards ?? false,
  };
}

export function initialBidFormFields(
  servicePricingModel: ServicePricingModel | "" = "",
): BidFormFields {
  return {
    amount_euros: "",
    service_pricing_model: servicePricingModel,
    offers_equipment: false,
    equipment_amount_euros: "",
    equipment_description: "",
    estimated_days: "",
    earliest_start_date: "",
    offer_scope: "",
    scope_terms: "",
    contract_terms: "",
    warranty_work: "",
    warranty_equipment: "",
    message: "",
    vat_included: true,
    confirms_licenses: false,
    confirms_building_standards: false,
  };
}

export function extractBidFormFields(formData: FormData): BidFormFields {
  return {
    amount_euros: String(formData.get("amount_euros") ?? ""),
    service_pricing_model: isServicePricingModel(
      String(formData.get("service_pricing_model") ?? ""),
    )
      ? (String(formData.get("service_pricing_model")) as ServicePricingModel)
      : "",
    offers_equipment: formData.get("offers_equipment") === "on",
    equipment_amount_euros: String(formData.get("equipment_amount_euros") ?? ""),
    equipment_description: String(formData.get("equipment_description") ?? ""),
    estimated_days: String(formData.get("estimated_days") ?? ""),
    earliest_start_date: String(formData.get("earliest_start_date") ?? ""),
    offer_scope: parseBidOfferScope(String(formData.get("offer_scope") ?? "")) ?? "",
    scope_terms: String(formData.get("scope_terms") ?? ""),
    contract_terms: String(formData.get("contract_terms") ?? ""),
    warranty_work: String(formData.get("warranty_work") ?? ""),
    warranty_equipment: String(formData.get("warranty_equipment") ?? ""),
    message: String(formData.get("message") ?? ""),
    vat_included: formData.get("vat_included") === "on",
    confirms_licenses: formData.get("confirms_licenses") === "on",
    confirms_building_standards:
      formData.get("confirms_building_standards") === "on",
  };
}

export function bidFieldsToFormData(
  fields: BidFormFields,
  projectId: string,
  requiresEquipmentWarranty: boolean,
): FormData {
  const fd = new FormData();
  fd.set("project_id", projectId);
  fd.set(
    "requires_equipment_warranty",
    requiresEquipmentWarranty ? "1" : "0",
  );
  fd.set("amount_euros", fields.amount_euros);
  if (fields.service_pricing_model) {
    fd.set("service_pricing_model", fields.service_pricing_model);
  }
  if (fields.offers_equipment) fd.set("offers_equipment", "on");
  fd.set("equipment_amount_euros", fields.equipment_amount_euros);
  fd.set("equipment_description", fields.equipment_description);
  fd.set("estimated_days", fields.estimated_days);
  fd.set("earliest_start_date", fields.earliest_start_date);
  if (fields.offer_scope) fd.set("offer_scope", fields.offer_scope);
  fd.set("scope_terms", fields.scope_terms);
  fd.set("contract_terms", fields.contract_terms);
  fd.set("warranty_work", fields.warranty_work);
  fd.set("warranty_equipment", fields.warranty_equipment);
  fd.set("message", fields.message);
  if (fields.vat_included) fd.set("vat_included", "on");
  if (fields.confirms_licenses) fd.set("confirms_licenses", "on");
  if (fields.confirms_building_standards) {
    fd.set("confirms_building_standards", "on");
  }
  return fd;
}

export type BidFormValidation =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors: Partial<Record<BidFormFieldKey, string>>;
    };

export function validateBidFormClient(
  fields: BidFormFields,
  options: {
    requiresEquipmentWarranty: boolean;
    allowOptionalEquipmentOffer: boolean;
    requiresDeviceAndInstallation: boolean;
    requiresOfferScope?: boolean;
    requiresServicePricing?: boolean;
  },
): BidFormValidation {
  const fieldErrors: Partial<Record<BidFormFieldKey, string>> = {};
  const amount = Number(fields.amount_euros);

  if (options.requiresOfferScope && !fields.offer_scope) {
    fieldErrors.offer_scope = "Valitse tarjouksen laajuus.";
  }

  if (options.requiresServicePricing && !fields.service_pricing_model) {
    fieldErrors.service_pricing_model = "Valitse hinnoittelutapa.";
  }

  if (!fields.amount_euros.trim()) {
    fieldErrors.amount_euros = "Anna asennuksen / työn hinta euroina.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    fieldErrors.amount_euros = "Hinnan täytyy olla suurempi kuin nolla.";
  }

  if (fields.offers_equipment && !options.allowOptionalEquipmentOffer) {
    fieldErrors.offers_equipment =
      "Asiakas ei ole sallinut laitetarjousta tähän pyyntöön.";
  }

  if (options.allowOptionalEquipmentOffer && fields.offers_equipment) {
    const equip = Number(fields.equipment_amount_euros);
    if (!fields.equipment_amount_euros.trim()) {
      fieldErrors.equipment_amount_euros = "Anna laitteen hinta euroina.";
    } else if (!Number.isFinite(equip) || equip <= 0) {
      fieldErrors.equipment_amount_euros =
        "Laitteen hinnan täytyy olla suurempi kuin nolla.";
    }
    if (!fields.equipment_description.trim()) {
      fieldErrors.equipment_description =
        "Kuvaile lyhyesti tarjoamasi laite (malli / toimitus).";
    }
  }

  if (!fields.message.trim()) {
    fieldErrors.message = "Kirjoita viesti asiakkaalle.";
  }

  const requiresEquipmentWarranty =
    options.requiresDeviceAndInstallation ||
    (options.allowOptionalEquipmentOffer && fields.offers_equipment);

  const termsFd = bidFieldsToFormData(
    fields,
    "",
    requiresEquipmentWarranty,
  );
  const terms = parseBidTermsFromFormData(termsFd, requiresEquipmentWarranty);
  if (!terms.ok) {
    if (terms.error.includes("työn takuu")) {
      fieldErrors.warranty_work = terms.error;
    } else if (terms.error.includes("laitteen takuu")) {
      fieldErrors.warranty_equipment = terms.error;
    } else if (
      terms.error.includes("toteutuspäivä") ||
      terms.error.includes("menneisyydessä")
    ) {
      fieldErrors.earliest_start_date = terms.error;
    } else if (terms.error.includes("luvat")) {
      fieldErrors.confirms_licenses = terms.error;
    } else if (terms.error.includes("rakennusvaatimuksia")) {
      fieldErrors.confirms_building_standards = terms.error;
    } else {
      fieldErrors.message = terms.error;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const first = Object.values(fieldErrors)[0] ?? "Tarkista lomake.";
    return { ok: false, error: first, fieldErrors };
  }

  return { ok: true };
}

export function bidFormTotalEuros(fields: BidFormFields): number {
  const work = Number(fields.amount_euros) || 0;
  const equip =
    fields.offers_equipment && fields.equipment_amount_euros
      ? Number(fields.equipment_amount_euros) || 0
      : 0;
  return work + equip;
}

export function bidRecordTotalEuros(bid: BidRecordForForm): number {
  return bidTotalAmountCents(bid) / 100;
}
