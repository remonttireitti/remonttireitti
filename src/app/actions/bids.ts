"use server";

import { ensureProjectConversation } from "@/app/actions/messages";
import { createPlatformInvoiceForBid } from "@/app/actions/platform-invoices";
import { notifyAdminsNewPlatformInvoice } from "@/lib/billing-admin";
import { platformFeeDueAt } from "@/lib/platform-fee";
import { resolvePlatformFeeCentsForContractor } from "@/lib/platform-fee-beta";
import {
  countContractorPlatformInvoices,
  finalizePlatformInvoiceAsPaid,
} from "@/lib/platform-invoice-finalize-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBidTermsFromFormData } from "@/lib/bid-terms";
import {
  extractBidFormFields,
  type BidFormFieldKey,
  type BidFormFields,
} from "@/lib/bid-form";
import { formatBidSaveError } from "@/lib/bid-save-errors";
import {
  userNotifyBidAccepted,
  userNotifyContactsRevealedCustomer,
  userNotifyOrderFinalizing,
  userNotifyBidRejected,
  userNotifyBidUpdated,
  userNotifyCounterOffer,
  userNotifyCounterOfferAccepted,
  userNotifyCounterOfferDeclined,
  userNotifyNewBid,
} from "@/lib/user-notify";
import { scheduleNotification } from "@/lib/schedule-notification";
import { isBidStale, STALE_BID_CUSTOMER_MESSAGE } from "@/lib/bid-staleness";
import {
  getOverBudgetBlockError,
  getProjectBudgetInfo,
} from "@/lib/project-budget";
import {
  projectAllowsOptionalEquipmentOffer,
  projectRequiresEquipmentWarranty,
} from "@/lib/project-equipment-supply";
import { bidFormTotalEuros } from "@/lib/bid-form";
import { parseBidOfferScope } from "@/lib/bid-offer-scope";
import {
  formatServicePricingScopeLine,
  isServicePricingModel,
} from "@/lib/service-engagement";
import { fetchProjectTradeContextForContractor } from "@/lib/project-trades-server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BidActionState = {
  error?: string;
  success?: string;
  fields?: BidFormFields;
  fieldErrors?: Partial<Record<BidFormFieldKey, string>>;
};

function bidError(
  formData: FormData,
  error: string,
  fieldErrors?: Partial<Record<BidFormFieldKey, string>>,
): BidActionState {
  return {
    error,
    fields: extractBidFormFields(formData),
    fieldErrors,
  };
}

type ParsedBidPayload = {
  projectId: string;
  message: string;
  amountCents: number;
  offersEquipment: boolean;
  equipmentAmountCents: number | null;
  equipmentDescription: string | null;
  estimatedDays: number | null;
  vatIncluded: boolean;
  terms: Extract<
    ReturnType<typeof parseBidTermsFromFormData>,
    { ok: true }
  >["data"];
  offerScope: ReturnType<typeof parseBidOfferScope>;
  project: {
    id: string;
    status: string;
    title: string;
    customer_id: string;
    details: unknown;
    content_revision: number;
  };
};

async function parseBidSubmission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  userId: string,
): Promise<ParsedBidPayload | BidActionState> {
  const projectId = String(formData.get("project_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const fields = extractBidFormFields(formData);
  const workEuros = Number(fields.amount_euros);
  const offersEquipment = fields.offers_equipment;
  const equipmentEuros = offersEquipment
    ? Number(fields.equipment_amount_euros)
    : 0;
  const equipmentDescription = offersEquipment
    ? fields.equipment_description.trim()
    : "";
  const totalEuros = bidFormTotalEuros(fields);
  const estimatedDaysRaw = String(formData.get("estimated_days") ?? "");
  const vatIncluded = formData.get("vat_included") === "on";

  if (!projectId || !message) {
    return bidError(formData, "Täytä viesti ja hinta.", {
      ...(!message.trim() ? { message: "Kirjoita viesti asiakkaalle." } : {}),
      ...(!workEuros || workEuros <= 0
        ? { amount_euros: "Anna kelvollinen hinta euroina." }
        : {}),
    });
  }

  if (!workEuros || workEuros <= 0) {
    return bidError(formData, "Anna kelvollinen asennuksen / työn hinta.", {
      amount_euros: "Hinnan täytyy olla suurempi kuin nolla.",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "contractor") {
    return bidError(formData, "Vain urakoitsijat voivat jättää tarjouksia.");
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, status, title, customer_id, details, budget_min, budget_max, content_revision",
    )
    .eq("id", projectId)
    .single();

  if (
    !project ||
    !["published", "receiving_bids"].includes(project.status)
  ) {
    return bidError(formData, "Tähän pyyntöön ei voi enää jättää tarjouksia.");
  }

  const projectDetails =
    project.details as Parameters<typeof projectAllowsOptionalEquipmentOffer>[0];
  const allowOptionalEquipmentOffer =
    projectAllowsOptionalEquipmentOffer(projectDetails);

  if (offersEquipment && !allowOptionalEquipmentOffer) {
    return bidError(
      formData,
      "Asiakas ei ole sallinut laitetarjousta tähän pyyntöön.",
      { offers_equipment: "Laitetarjous ei ole sallittu." },
    );
  }

  if (offersEquipment) {
    if (!equipmentEuros || equipmentEuros <= 0) {
      return bidError(formData, "Anna laitteen hinta.", {
        equipment_amount_euros:
          "Laitteen hinnan täytyy olla suurempi kuin nolla.",
      });
    }
    if (!equipmentDescription) {
      return bidError(formData, "Kuvaile tarjoamasi laite.", {
        equipment_description: "Kuvaile lyhyesti laite / toimitus.",
      });
    }
  }

  const budgetInfo = getProjectBudgetInfo(project);
  const overBudgetError = getOverBudgetBlockError(totalEuros, budgetInfo);
  if (overBudgetError) {
    return bidError(formData, overBudgetError, {
      amount_euros: overBudgetError,
    });
  }

  const requiresEquipmentWarranty = projectRequiresEquipmentWarranty(
    projectDetails,
    offersEquipment,
  );
  const terms = parseBidTermsFromFormData(formData, requiresEquipmentWarranty);
  if (!terms.ok) return bidError(formData, terms.error);

  const pricingModel = String(formData.get("service_pricing_model") ?? "");
  if (isServicePricingModel(pricingModel)) {
    const pricingLine = formatServicePricingScopeLine(pricingModel, workEuros);
    const existingScope = terms.data.scope_terms?.trim();
    terms.data.scope_terms = existingScope
      ? `${pricingLine}\n\n${existingScope}`
      : pricingLine;
  }

  const tradeContext = await fetchProjectTradeContextForContractor(
    supabase,
    projectId,
    userId,
  );
  const offerScope = parseBidOfferScope(String(formData.get("offer_scope") ?? ""));

  if (tradeContext.isMultiTrade && !offerScope) {
    return bidError(formData, "Valitse tarjouksen laajuus.", {
      offer_scope: "Valitse kokonaisurakka tai oman ammattisi osuus.",
    });
  }

  return {
    projectId,
    message,
    amountCents: Math.round(workEuros * 100),
    offersEquipment,
    equipmentAmountCents: offersEquipment
      ? Math.round(equipmentEuros * 100)
      : null,
    equipmentDescription: offersEquipment ? equipmentDescription : null,
    estimatedDays: estimatedDaysRaw ? Number(estimatedDaysRaw) : null,
    vatIncluded,
    terms: terms.data,
    offerScope: tradeContext.isMultiTrade ? offerScope : null,
    project,
  };
}

function bidRowFromPayload(
  payload: ParsedBidPayload,
  status: "submitted",
) {
  return {
    status,
    amount_cents: payload.amountCents,
    offers_equipment: payload.offersEquipment,
    equipment_amount_cents: payload.equipmentAmountCents,
    equipment_description: payload.equipmentDescription,
    vat_included: payload.vatIncluded,
    estimated_days: payload.estimatedDays,
    message: payload.message,
    scope_terms: payload.terms.scope_terms,
    contract_terms: payload.terms.contract_terms,
    warranty_work: payload.terms.warranty_work,
    warranty_equipment: payload.terms.warranty_equipment,
    earliest_start_date: payload.terms.earliest_start_date,
    confirms_licenses: payload.terms.confirms_licenses,
    confirms_building_standards: payload.terms.confirms_building_standards,
    offer_scope: payload.offerScope,
    submitted_at: new Date().toISOString(),
    confirmed_content_revision: payload.project.content_revision,
    rejection_message: null,
    rejected_at: null,
  };
}

function revalidateBidPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  revalidatePath(`/tarjoukset/${projectId}`);
  revalidatePath(`/remontti/${projectId}`);
}

export async function submitBid(
  _prev: BidActionState,
  formData: FormData,
): Promise<BidActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return bidError(formData, "Kirjaudu sisään.");

  const parsed = await parseBidSubmission(supabase, formData, user.id);
  if (!("project" in parsed)) return parsed;

  const payload = parsed;

  const { data: existing } = await supabase
    .from("bids")
    .select("id, status")
    .eq("project_id", payload.projectId)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (existing?.status === "submitted") {
    return bidError(
      formData,
      "Sinulla on jo aktiivinen tarjous. Muokkaa sitä alla tai peru tarjous.",
    );
  }

  const row = bidRowFromPayload(payload, "submitted");

  const isResubmission =
    existing?.status === "withdrawn" || existing?.status === "rejected";

  if (isResubmission) {
    const { error } = await supabase
      .from("bids")
      .update(row)
      .eq("id", existing!.id)
      .eq("contractor_id", user.id);

    if (error) {
      console.error("[submitBid/resubmit]", error.code, error.message);
      return bidError(formData, formatBidSaveError(error));
    }
  } else if (existing) {
    return bidError(formData, "Tähän pyyntöön et voi enää jättää tarjousta.");
  } else {
    const { error } = await supabase.from("bids").insert({
      project_id: payload.projectId,
      contractor_id: user.id,
      ...row,
    });

    if (error) {
      console.error("[submitBid]", error.code, error.message);
      return bidError(formData, formatBidSaveError(error));
    }
  }

  const { data: contractor } = await supabase
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", user.id)
    .single();

  const notifyPayload = {
    customerId: payload.project.customer_id,
    projectTitle: payload.project.title,
    projectId: payload.projectId,
    contractorCompany: contractor?.company_name ?? "Urakoitsija",
  };

  if (isResubmission && existing?.status === "rejected") {
    scheduleNotification(() => userNotifyBidUpdated(notifyPayload));
  } else {
    scheduleNotification(() => userNotifyNewBid(notifyPayload));
  }

  if (payload.project.status === "published") {
    await supabase
      .from("projects")
      .update({ status: "receiving_bids" })
      .eq("id", payload.projectId);
  }

  revalidateBidPaths(payload.projectId);
  redirect(`/tarjoukset/${payload.projectId}?tarjous=lahetetty`);
}

export async function updateBid(
  _prev: BidActionState,
  formData: FormData,
): Promise<BidActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return bidError(formData, "Kirjaudu sisään.");

  const bidId = String(formData.get("bid_id") ?? "");
  if (!bidId) return bidError(formData, "Puuttuva tarjous.");

  const parsed = await parseBidSubmission(supabase, formData, user.id);
  if (!("project" in parsed)) return parsed;

  const payload = parsed;

  const { data: bid } = await supabase
    .from("bids")
    .select("id, status")
    .eq("id", bidId)
    .eq("project_id", payload.projectId)
    .eq("contractor_id", user.id)
    .single();

  if (!bid || !["submitted", "rejected"].includes(bid.status)) {
    return bidError(
      formData,
      "Vain lähetettyä tai hylättyä tarjousta voi muokata.",
    );
  }

  const { error } = await supabase
    .from("bids")
    .update(bidRowFromPayload(payload, "submitted"))
    .eq("id", bidId);

  if (error) {
    console.error("[updateBid]", error.code, error.message);
    return bidError(formData, formatBidSaveError(error));
  }

  if (bid.status === "rejected") {
    const { data: contractor } = await supabase
      .from("contractor_profiles")
      .select("company_name")
      .eq("id", user.id)
      .single();

    scheduleNotification(() =>
      userNotifyBidUpdated({
        customerId: payload.project.customer_id,
        projectTitle: payload.project.title,
        projectId: payload.projectId,
        contractorCompany: contractor?.company_name ?? "Urakoitsija",
      }),
    );
  }

  revalidateBidPaths(payload.projectId);
  redirect(`/tarjoukset/${payload.projectId}?tarjous=paivitetty`);
}

export async function withdrawBid(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  const bidId = String(formData.get("bid_id") ?? "");

  if (!projectId || !bidId) return { error: "Puuttuvat tiedot." };

  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  if (
    !project ||
    !["published", "receiving_bids"].includes(project.status)
  ) {
    return { error: "Tarjousta ei voi perua tässä vaiheessa." };
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, status")
    .eq("id", bidId)
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .single();

  if (!bid || bid.status !== "submitted") {
    return { error: "Vain lähetetty tarjous voidaan perua." };
  }

  const { error } = await supabase
    .from("bids")
    .update({ status: "withdrawn" })
    .eq("id", bidId);

  if (error) return { error: "Tarjouksen peruminen epäonnistui." };

  revalidateBidPaths(projectId);
  return {};
}

export type CounterOfferActionState = { error?: string; success?: string };

export async function submitCounterOffer(
  _prev: CounterOfferActionState,
  formData: FormData,
): Promise<CounterOfferActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const bidId = String(formData.get("bid_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const amountEuros = Number(formData.get("counter_amount_euros"));
  const message = String(formData.get("counter_message") ?? "").trim();

  if (!bidId || !projectId) return { error: "Puuttuvat tiedot." };
  if (!amountEuros || amountEuros <= 0) {
    return { error: "Anna kelvollinen vastatarjouksen hinta." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status, title, content_revision")
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }

  if (!["published", "receiving_bids"].includes(project.status)) {
    return { error: "Vastatarjousta ei voi jättää tässä vaiheessa." };
  }

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, contractor_id, status, amount_cents, confirmed_content_revision, counter_status",
    )
    .eq("id", bidId)
    .eq("project_id", projectId)
    .single();

  if (!bid || bid.status !== "submitted") {
    return { error: "Vastatarjousta voi jättää vain lähetettyyn tarjoukseen." };
  }

  if (bid.counter_status === "pending") {
    return { error: "Odota urakoitsijan vastausta aiempaan vastatarjoukseen." };
  }

  if (isBidStale(bid, project.content_revision)) {
    return { error: STALE_BID_CUSTOMER_MESSAGE };
  }

  const counterCents = Math.round(amountEuros * 100);

  const { error } = await supabase
    .from("bids")
    .update({
      counter_amount_cents: counterCents,
      counter_message: message || null,
      counter_offered_at: new Date().toISOString(),
      counter_status: "pending",
    })
    .eq("id", bidId);

  if (error) {
    console.error("[submitCounterOffer]", error.code, error.message);
    return { error: "Vastatarjouksen tallennus epäonnistui." };
  }

  scheduleNotification(() =>
    userNotifyCounterOffer({
      contractorId: bid.contractor_id,
      projectTitle: project.title,
      projectId,
      amountEuros,
    }),
  );

  revalidateBidPaths(projectId);
  return { success: "Vastatarjous lähetetty urakoitsijalle." };
}

export async function acceptCounterOffer(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const bidId = String(formData.get("bid_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, contractor_id, status, counter_amount_cents, counter_status, project_id",
    )
    .eq("id", bidId)
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .single();

  if (
    !bid ||
    bid.status !== "submitted" ||
    bid.counter_status !== "pending" ||
    bid.counter_amount_cents == null
  ) {
    return { error: "Ei odottavaa vastatarjousta." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("customer_id, title, status")
    .eq("id", projectId)
    .single();

  if (!project || !["published", "receiving_bids"].includes(project.status)) {
    return { error: "Vastatarjoukseen ei voi vastata tässä vaiheessa." };
  }

  const { error } = await supabase
    .from("bids")
    .update({
      amount_cents: bid.counter_amount_cents,
      counter_status: "accepted",
    })
    .eq("id", bidId);

  if (error) return { error: "Vastatarjouksen hyväksyntä epäonnistui." };

  scheduleNotification(() =>
    userNotifyCounterOfferAccepted({
      customerId: project.customer_id,
      projectTitle: project.title,
      projectId,
      amountEuros: bid.counter_amount_cents / 100,
    }),
  );

  revalidateBidPaths(projectId);
  return {};
}

export async function declineCounterOffer(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const bidId = String(formData.get("bid_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");

  const { data: bid } = await supabase
    .from("bids")
    .select("id, counter_amount_cents, amount_cents")
    .eq("id", bidId)
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .eq("status", "submitted")
    .eq("counter_status", "pending")
    .maybeSingle();

  const { data: project } = await supabase
    .from("projects")
    .select("customer_id, title")
    .eq("id", projectId)
    .single();

  const { error } = await supabase
    .from("bids")
    .update({
      counter_status: "declined",
    })
    .eq("id", bidId)
    .eq("project_id", projectId)
    .eq("contractor_id", user.id)
    .eq("status", "submitted")
    .eq("counter_status", "pending");

  if (error) return { error: "Vastatarjouksen hylkäys epäonnistui." };

  if (
    bid &&
    project &&
    bid.counter_amount_cents != null &&
    bid.amount_cents != null
  ) {
    scheduleNotification(() =>
      userNotifyCounterOfferDeclined({
        customerId: project.customer_id,
        projectTitle: project.title,
        projectId,
        counterAmountEuros: bid.counter_amount_cents / 100,
        originalAmountEuros: bid.amount_cents / 100,
      }),
    );
  }

  revalidateBidPaths(projectId);
  return {};
}

export type RejectBidActionState = { error?: string; success?: string };

export async function rejectBid(
  _prev: RejectBidActionState,
  formData: FormData,
): Promise<RejectBidActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const bidId = String(formData.get("bid_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const rejectionMessage = String(formData.get("rejection_message") ?? "").trim();

  if (!bidId || !projectId) return { error: "Puuttuvat tiedot." };

  if (rejectionMessage.length < 5) {
    return {
      error: "Kirjoita lyhyt perustelu hylkäykselle (vähintään 5 merkkiä).",
    };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status, title, content_revision")
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }

  if (!["published", "receiving_bids"].includes(project.status)) {
    return { error: "Tarjousta ei voi hylätä tässä vaiheessa." };
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, contractor_id, status, confirmed_content_revision")
    .eq("id", bidId)
    .eq("project_id", projectId)
    .single();

  if (!bid || bid.status !== "submitted") {
    return { error: "Vain lähetetty tarjous voidaan hylätä." };
  }

  if (isBidStale(bid, project.content_revision)) {
    return { error: STALE_BID_CUSTOMER_MESSAGE };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bids")
    .update({
      status: "rejected",
      rejection_message: rejectionMessage,
      rejected_at: now,
      counter_status: null,
      counter_amount_cents: null,
      counter_message: null,
      counter_offered_at: null,
    })
    .eq("id", bidId);

  if (error) {
    console.error("[rejectBid]", error.code, error.message);
    return { error: "Tarjouksen hylkäys epäonnistui." };
  }

  scheduleNotification(() =>
    userNotifyBidRejected({
      contractorId: bid.contractor_id,
      projectTitle: project.title,
      projectId,
      rejectionMessage,
    }),
  );

  revalidateBidPaths(projectId);
  return { success: "Tarjous hylätty." };
}

export async function acceptBid(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const bidId = String(formData.get("bid_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");

  if (!bidId || !projectId) return;

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, customer_id, status, title, content_revision, job_types ( slug )",
    )
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) return;

  if (!["published", "receiving_bids"].includes(project.status)) return;

  const includeEquipmentRaw = String(formData.get("include_equipment") ?? "");

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, project_id, contractor_id, status, amount_cents, offers_equipment, equipment_amount_cents, confirmed_content_revision, counter_status",
    )
    .eq("id", bidId)
    .eq("project_id", projectId)
    .single();

  if (!bid || bid.status !== "submitted") return;

  if (bid.counter_status === "pending") {
    redirect(`/remontti/${projectId}?virhe=vastatarjous-odottaa`);
  }

  if (isBidStale(bid, project.content_revision)) {
    redirect(`/remontti/${projectId}?virhe=vanhentunut-tarjous`);
  }

  const splitEquipmentOffer =
    Boolean(bid.offers_equipment) &&
    bid.equipment_amount_cents != null &&
    bid.equipment_amount_cents > 0;

  let acceptedIncludesEquipment: boolean | null = null;
  if (splitEquipmentOffer) {
    if (includeEquipmentRaw !== "1" && includeEquipmentRaw !== "0") {
      redirect(`/remontti/${projectId}?virhe=valitse-laite`);
    }
    acceptedIncludesEquipment = includeEquipmentRaw === "1";
  } else {
    acceptedIncludesEquipment = Boolean(bid.offers_equipment);
  }

  const { count: bidderCount } = await supabase
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "submitted");

  const jobType = Array.isArray(project.job_types)
    ? project.job_types[0]
    : project.job_types;
  const jobSlug =
    (jobType as { slug?: string } | null)?.slug ?? "ilmalampopumppu";

  const admin = createAdminClient();
  const priorInvoiceCount = await countContractorPlatformInvoices(
    admin,
    bid.contractor_id,
  );
  const feeCents = resolvePlatformFeeCentsForContractor({
    jobTypeSlug: jobSlug,
    bidderCount: bidderCount ?? 1,
    priorInvoiceCount,
  });
  const feeWaived = feeCents === 0;

  const commitDeadline = platformFeeDueAt();

  await supabase
    .from("projects")
    .update({
      status: "bid_accepted",
      accepted_bid_id: bidId,
    })
    .eq("id", projectId);

  await supabase
    .from("bids")
    .update({ accepted_includes_equipment: acceptedIncludesEquipment })
    .eq("id", bidId);

  await ensureProjectConversation(
    supabase,
    projectId,
    user.id,
    bid.contractor_id,
  );

  const invoiceRes = await createPlatformInvoiceForBid(supabase, {
    projectId,
    bidId,
    contractorId: bid.contractor_id,
    dueAt: commitDeadline,
    amountCents: feeCents,
  });

  if (invoiceRes.error) {
    redirect(`/remontti/${projectId}?virhe=lasku`);
  }

  if (feeWaived && invoiceRes.invoiceId) {
    const finalizeRes = await finalizePlatformInvoiceAsPaid(
      admin,
      invoiceRes.invoiceId,
      projectId,
    );
    if (finalizeRes.error) {
      redirect(`/remontti/${projectId}?virhe=lasku`);
    }
  }

  if (invoiceRes.invoiceId && !feeWaived) {
    void notifyAdminsNewPlatformInvoice({
      invoiceId: invoiceRes.invoiceId,
      projectId,
      projectTitle: project.title,
      contractorId: bid.contractor_id,
      amountCents: feeCents,
    });
    revalidatePath("/admin/laskutus");
  }

  const { data: contractorProfile } = await supabase
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", bid.contractor_id)
    .maybeSingle();

  const contractorName = contractorProfile?.company_name ?? "Urakoitsija";

  if (feeWaived) {
    scheduleNotification(() =>
      userNotifyContactsRevealedCustomer({
        customerId: user.id,
        projectId,
        projectTitle: project.title,
        contractorName,
      }),
    );
  } else {
    scheduleNotification(() =>
      userNotifyOrderFinalizing({
        customerId: user.id,
        projectId,
        projectTitle: project.title,
        contractorName,
        commitDeadline,
      }),
    );
  }

  const acceptedAmountCents =
    acceptedIncludesEquipment && bid.equipment_amount_cents
      ? bid.amount_cents + bid.equipment_amount_cents
      : bid.amount_cents;

  scheduleNotification(() =>
    userNotifyBidAccepted({
      contractorId: bid.contractor_id,
      projectTitle: project.title,
      projectId,
      commitDeadline,
      feeCents,
      acceptedAmountCents,
      acceptedIncludesEquipment: acceptedIncludesEquipment ?? false,
    }),
  );

  revalidatePath(`/remontti/${projectId}`);
  revalidatePath(`/tarjoukset/urakka/${projectId}`);
  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  redirect(`/remontti/${projectId}?hyvaksytty=1`);
}
