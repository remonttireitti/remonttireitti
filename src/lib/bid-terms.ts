export type BidTermsFields = {
  scope_terms: string | null;
  contract_terms: string | null;
  warranty_work: string;
  warranty_equipment: string | null;
  earliest_start_date: string;
  confirms_licenses: boolean;
  confirms_building_standards: boolean;
};

export type ParsedBidTerms =
  | { ok: true; data: BidTermsFields }
  | { ok: false; error: string };

const MIN_WARRANTY_LENGTH = 8;

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseBidTermsFromFormData(
  formData: FormData,
  requiresEquipmentWarranty: boolean,
): ParsedBidTerms {
  const scopeTerms = String(formData.get("scope_terms") ?? "").trim();
  const contractTerms = String(formData.get("contract_terms") ?? "").trim();
  const warrantyWork = String(formData.get("warranty_work") ?? "").trim();
  const warrantyEquipment = String(
    formData.get("warranty_equipment") ?? "",
  ).trim();
  const earliestStart = String(formData.get("earliest_start_date") ?? "").trim();
  const confirmsLicenses = formData.get("confirms_licenses") === "on";
  const confirmsStandards =
    formData.get("confirms_building_standards") === "on";

  if (warrantyWork.length < MIN_WARRANTY_LENGTH) {
    return {
      ok: false,
      error: "Kirjoita työn takuuehdot (vähintään muutama sana).",
    };
  }

  if (requiresEquipmentWarranty) {
    if (warrantyEquipment.length < MIN_WARRANTY_LENGTH) {
      return {
        ok: false,
        error: "Kirjoita laitteen takuuehdot tai valitse asiakkaan hankkimat laitteet.",
      };
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(earliestStart)) {
    return { ok: false, error: "Valitse ensimmäinen mahdollinen toteutuspäivä." };
  }

  if (earliestStart < todayIsoDate()) {
    return {
      ok: false,
      error: "Toteutuspäivä ei voi olla menneisyydessä.",
    };
  }

  if (!confirmsLicenses) {
    return {
      ok: false,
      error: "Vahvista, että yritykselläsi on tarvittavat luvat.",
    };
  }

  if (!confirmsStandards) {
    return {
      ok: false,
      error:
        "Vahvista, että noudatatte rakennusvaatimuksia ja hyviä rakennustapoja.",
    };
  }

  return {
    ok: true,
    data: {
      scope_terms: scopeTerms || null,
      contract_terms: contractTerms || null,
      warranty_work: warrantyWork,
      warranty_equipment: requiresEquipmentWarranty ? warrantyEquipment : null,
      earliest_start_date: earliestStart,
      confirms_licenses: true,
      confirms_building_standards: true,
    },
  };
}

export function formatBidDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${Number(d)}.${Number(m)}.${y}`;
}
