"use server";

import {
  parseIlpDetailsJson,
  validateIlpDetails,
} from "@/lib/ilmalampopumppu-details";
import {
  parseIvlpDetailsJson,
  validateIvlpDetails,
} from "@/lib/ilmavesilampopumppu-details";
import {
  parseMaalampDetailsJson,
  validateMaalampDetails,
} from "@/lib/maalampopumppu-details";
import { ensureProfile } from "@/lib/ensure-profile";
import { uploadProjectPhotosFromFormData } from "@/lib/project-photos";
import {
  notifyContractorsNewMaintenanceProject,
  notifyContractorsNewPublishedProject,
} from "@/lib/contractor-project-notify";
import type { DeviceCategory } from "@/constants/maintenance";
import {
  parseDeviceMaintenanceJson,
  validateDeviceMaintenanceDetails,
} from "@/lib/device-maintenance-details";
import {
  userNotifyProjectCancelled,
  userNotifyProjectUpdated,
} from "@/lib/user-notify";
import { formatProjectSaveError } from "@/lib/project-save-errors";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ProjectActionState = {
  error?: string;
};

function parseTradeIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export async function createProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Kirjaudu sisään jatkaaksesi." };
  }

  await ensureProfile(user);

  const jobTypeId = String(formData.get("job_type_id") ?? "");
  let categoryId = String(formData.get("category_id") ?? "");
  const tradeIds = parseTradeIds(String(formData.get("trade_ids") ?? "[]"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const addressLine = String(formData.get("address_line") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const publish = formData.get("publish") === "true";

  const budgetMinRaw = String(formData.get("budget_min") ?? "");
  const budgetMaxRaw = String(formData.get("budget_max") ?? "");
  const desiredStart = String(formData.get("desired_start") ?? "").trim();
  const flexibilityWeeks = Number(formData.get("flexibility_weeks") ?? 4);
  const detailsKind = String(formData.get("details_kind") ?? "").trim();
  const detailsJsonRaw = String(formData.get("details_json") ?? "").trim();
  let projectDetails: Record<string, unknown> = {};
  if (detailsJsonRaw && detailsKind === "laitteen_huolto") {
    const parsed = parseDeviceMaintenanceJson(detailsJsonRaw);
    if (!parsed) {
      return {
        error: "Huolto-/korjaustiedot ovat virheelliset. Täytä lomake uudelleen.",
      };
    }
    const detailsErr = validateDeviceMaintenanceDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { laitteen_huolto: parsed };
  } else if (detailsJsonRaw && detailsKind === "maalampopumppu") {
    const parsed = parseMaalampDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateMaalampDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { maalampopumppu: parsed };
  } else if (detailsJsonRaw && detailsKind === "ilmavesilampopumppu") {
    const parsed = parseIvlpDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateIvlpDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { ilmavesilampopumppu: parsed };
  } else if (detailsJsonRaw) {
    const parsed = parseIlpDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateIlpDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { ilmalampopumppu: parsed };
  }

  if (!jobTypeId || tradeIds.length === 0) {
    return { error: "Valitse työ ja vähintään yksi ammatti." };
  }

  if (
    !title ||
    !description ||
    !municipality ||
    !postalCode ||
    !addressLine ||
    !contactEmail ||
    !contactPhone
  ) {
    return { error: "Täytä kaikki pakolliset kentät." };
  }

  if (!categoryId) {
    const { data: jt } = await supabase
      .from("job_types")
      .select("legacy_category_id")
      .eq("id", jobTypeId)
      .maybeSingle();
    categoryId = jt?.legacy_category_id ?? "";
  }

  if (!categoryId) {
    const { data: fallback } = await supabase
      .from("service_categories")
      .select("id")
      .eq("slug", "muu")
      .maybeSingle();
    categoryId = fallback?.id ?? "";
  }

  if (!categoryId) {
    return { error: "Kategoriat eivät ole käytettävissä. Ota yhteyttä ylläpitoon." };
  }

  if (title.length < 5) {
    return { error: "Otsikon pitää olla vähintään 5 merkkiä." };
  }

  if (description.length < 20) {
    return { error: "Kuvauksen pitää olla vähintään 20 merkkiä." };
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return { error: "Postinumeron pitää olla 5 numeroa." };
  }

  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) {
    return { error: "Budjetin minimi on virheellinen." };
  }
  if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) {
    return { error: "Budjetin maksimi on virheellinen." };
  }
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return { error: "Budjetin minimi ei voi olla suurempi kuin maksimi." };
  }

  const now = new Date();
  const bidDeadline = new Date(now);
  bidDeadline.setDate(bidDeadline.getDate() + 14);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      customer_id: user.id,
      category_id: categoryId,
      job_type_id: jobTypeId,
      title,
      description,
      municipality,
      postal_code: postalCode,
      address_line: addressLine,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      budget_min: budgetMin,
      budget_max: budgetMax,
      desired_start: desiredStart || null,
      flexibility_weeks: flexibilityWeeks,
      details: projectDetails,
      status: publish ? "published" : "draft",
      published_at: publish ? now.toISOString() : null,
      bid_deadline: publish ? bidDeadline.toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createProject] insert failed:", error.code, error.message);
    return { error: formatProjectSaveError(error) };
  }

  const { error: contactErr } = await supabase.from("project_contacts").insert({
    project_id: data.id,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    address_line: addressLine,
  });

  if (contactErr) {
    return { error: "Yhteystietojen tallennus epäonnistui. Yritä uudelleen." };
  }

  const { error: tradesErr } = await supabase.from("project_trades").insert(
    tradeIds.map((trade_id) => ({
      project_id: data.id,
      trade_id,
    })),
  );

  if (tradesErr) {
    return {
      error:
        "Pyyntö tallentui, mutta ammattien liitos epäonnistui. Päivitä pyyntöä.",
    };
  }

  try {
    await uploadProjectPhotosFromFormData(data.id, formData);
  } catch (photoErr) {
    const message =
      photoErr instanceof Error
        ? photoErr.message
        : "Kuvien tallennus epäonnistui.";
    const isSetupIssue =
      message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      message.includes("project_photos") ||
      message.includes("Bucket not found");

    if (isSetupIssue) {
      console.error("[createProject] photos skipped:", message);
    } else {
      await supabase.from("projects").delete().eq("id", data.id);
      return { error: `${message} Yritä uudelleen.` };
    }
  }

  if (publish) {
    const maintenance = projectDetails.laitteen_huolto as
      | { device_category?: string }
      | undefined;
    if (maintenance?.device_category) {
      void notifyContractorsNewMaintenanceProject({
        projectId: data.id,
        projectTitle: title,
        jobTypeId,
        deviceCategory: maintenance.device_category as DeviceCategory,
        municipality,
        postalCode,
      });
    } else {
      void notifyContractorsNewPublishedProject({
        projectId: data.id,
        projectTitle: title,
        jobTypeId,
        municipality,
        postalCode,
      });
    }
  }

  revalidatePath("/oma-tili");
  revalidatePath(`/remontti/${data.id}`);
  revalidatePath("/tarjoukset");
  redirect(publish ? `/remontti/${data.id}?julkaistu=1` : `/remontti/${data.id}?luonnos=1`);
}

export async function publishProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Puuttuva pyyntö." };

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, customer_id, status, title, job_type_id, municipality, postal_code, details",
    )
    .eq("id", projectId)
    .single();

  if (!project || project.customer_id !== user.id) {
    return { error: "Ei oikeutta." };
  }

  if (project.status !== "draft") {
    return { error: "Vain luonnosta voi julkaista." };
  }

  const now = new Date();
  const bidDeadline = new Date(now);
  bidDeadline.setDate(bidDeadline.getDate() + 14);

  const { error } = await supabase
    .from("projects")
    .update({
      status: "published",
      published_at: now.toISOString(),
      bid_deadline: bidDeadline.toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    console.error("[publishProject]", error.code, error.message);
    return { error: formatProjectSaveError(error) };
  }

  const maintenance = (project.details as { laitteen_huolto?: { device_category?: string } })
    ?.laitteen_huolto;
  if (maintenance?.device_category) {
    void notifyContractorsNewMaintenanceProject({
      projectId,
      projectTitle: project.title,
      jobTypeId: project.job_type_id,
      deviceCategory: maintenance.device_category as DeviceCategory,
      municipality: project.municipality,
      postalCode: project.postal_code,
    });
  } else {
    void notifyContractorsNewPublishedProject({
      projectId,
      projectTitle: project.title,
      jobTypeId: project.job_type_id,
      municipality: project.municipality,
      postalCode: project.postal_code,
    });
  }

  revalidateCustomerProjectPaths(projectId);
  redirect(`/remontti/${projectId}?julkaistu=1`);
}

const EDITABLE_PROJECT_STATUSES = ["draft", "published", "receiving_bids"] as const;

const CANCELLABLE_PROJECT_STATUSES = [
  "draft",
  "published",
  "receiving_bids",
] as const;

export type CancelProjectActionState = { error?: string; success?: string };

function revalidateCustomerProjectPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  revalidatePath(`/remontti/${projectId}`);
  revalidatePath(`/remontti/${projectId}/muokkaa`);
  revalidatePath(`/tarjoukset/${projectId}`);
  revalidatePath(`/tarjoukset/urakka/${projectId}`);
}

export async function cancelCustomerProject(
  _prev: CancelProjectActionState,
  formData: FormData,
): Promise<CancelProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Kirjaudu sisään." };
  }

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) {
    return { error: "Puuttuva pyyntö." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status, title")
    .eq("id", projectId)
    .eq("customer_id", user.id)
    .single();

  if (!project) {
    return { error: "Pyyntöä ei löytynyt tai sinulla ei ole oikeutta perua sitä." };
  }

  if (project.status === "cancelled") {
    return { success: "Tarjouspyyntö on jo peruttu." };
  }

  if (
    !CANCELLABLE_PROJECT_STATUSES.includes(
      project.status as (typeof CANCELLABLE_PROJECT_STATUSES)[number],
    )
  ) {
    return {
      error:
        "Pyyntöä ei voi perua tässä vaiheessa (esim. tarjous on jo hyväksytty).",
    };
  }

  const { data: openBids } = await supabase
    .from("bids")
    .select("id, contractor_id, status")
    .eq("project_id", projectId)
    .in("status", ["submitted", "draft"]);

  const now = new Date().toISOString();
  const rejectionMessage = "Asiakas perui tarjouspyynnön.";

  if (openBids && openBids.length > 0) {
    const { error: bidsErr } = await supabase
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
      .eq("project_id", projectId)
      .in("status", ["submitted", "draft"]);

    if (bidsErr) {
      console.error("[cancelCustomerProject] bids", bidsErr.code, bidsErr.message);
      return { error: "Tarjousten poisto epäonnistui." };
    }
  }

  const { error: projectErr } = await supabase
    .from("projects")
    .update({ status: "cancelled" })
    .eq("id", projectId)
    .eq("customer_id", user.id);

  if (projectErr) {
    console.error(
      "[cancelCustomerProject] project",
      projectErr.code,
      projectErr.message,
    );
    return { error: "Tarjouspyynnön peruminen epäonnistui." };
  }

  for (const bid of openBids ?? []) {
    void userNotifyProjectCancelled({
      contractorId: bid.contractor_id,
      projectTitle: project.title,
      projectId,
    });
  }

  revalidateCustomerProjectPaths(projectId);
  return { success: "Tarjouspyyntö peruttu. Saapuneet tarjoukset poistettiin." };
}

export async function updateProject(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Kirjaudu sisään jatkaaksesi." };
  }

  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) {
    return { error: "Puuttuva pyyntö." };
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("id, status, content_revision, title")
    .eq("id", projectId)
    .eq("customer_id", user.id)
    .single();

  if (!existing) {
    return { error: "Pyyntöä ei löytynyt tai sinulla ei ole oikeutta muokata sitä." };
  }

  if (
    !EDITABLE_PROJECT_STATUSES.includes(
      existing.status as (typeof EDITABLE_PROJECT_STATUSES)[number],
    )
  ) {
    return {
      error: "Pyyntöä ei voi muokata tässä vaiheessa (esim. tarjous jo hyväksytty).",
    };
  }

  const jobTypeId = String(formData.get("job_type_id") ?? "");
  let categoryId = String(formData.get("category_id") ?? "");
  const tradeIds = parseTradeIds(String(formData.get("trade_ids") ?? "[]"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const addressLine = String(formData.get("address_line") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();

  const budgetMinRaw = String(formData.get("budget_min") ?? "");
  const budgetMaxRaw = String(formData.get("budget_max") ?? "");
  const desiredStart = String(formData.get("desired_start") ?? "").trim();
  const flexibilityWeeks = Number(formData.get("flexibility_weeks") ?? 4);
  const detailsKind = String(formData.get("details_kind") ?? "").trim();
  const detailsJsonRaw = String(formData.get("details_json") ?? "").trim();
  let projectDetails: Record<string, unknown> = {};
  if (detailsJsonRaw && detailsKind === "maalampopumppu") {
    const parsed = parseMaalampDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateMaalampDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { maalampopumppu: parsed };
  } else if (detailsJsonRaw && detailsKind === "ilmavesilampopumppu") {
    const parsed = parseIvlpDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateIvlpDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { ilmavesilampopumppu: parsed };
  } else if (detailsJsonRaw) {
    const parsed = parseIlpDetailsJson(detailsJsonRaw);
    if (!parsed) {
      return { error: "Lämpöpumpun tiedot ovat virheelliset. Täytä lomake uudelleen." };
    }
    const detailsErr = validateIlpDetails(parsed);
    if (detailsErr) return { error: detailsErr };
    projectDetails = { ilmalampopumppu: parsed };
  }

  if (!jobTypeId || tradeIds.length === 0) {
    return { error: "Valitse työ ja vähintään yksi ammatti." };
  }

  if (
    !title ||
    !description ||
    !municipality ||
    !postalCode ||
    !addressLine ||
    !contactEmail ||
    !contactPhone
  ) {
    return { error: "Täytä kaikki pakolliset kentät." };
  }

  if (!categoryId) {
    const { data: jt } = await supabase
      .from("job_types")
      .select("legacy_category_id")
      .eq("id", jobTypeId)
      .maybeSingle();
    categoryId = jt?.legacy_category_id ?? "";
  }

  if (!categoryId) {
    const { data: fallback } = await supabase
      .from("service_categories")
      .select("id")
      .eq("slug", "muu")
      .maybeSingle();
    categoryId = fallback?.id ?? "";
  }

  if (!categoryId) {
    return { error: "Kategoriat eivät ole käytettävissä. Ota yhteyttä ylläpitoon." };
  }

  if (title.length < 5) {
    return { error: "Otsikon pitää olla vähintään 5 merkkiä." };
  }

  if (description.length < 20) {
    return { error: "Kuvauksen pitää olla vähintään 20 merkkiä." };
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return { error: "Postinumeron pitää olla 5 numeroa." };
  }

  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (budgetMin !== null && (Number.isNaN(budgetMin) || budgetMin < 0)) {
    return { error: "Budjetin minimi on virheellinen." };
  }
  if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) {
    return { error: "Budjetin maksimi on virheellinen." };
  }
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return { error: "Budjetin minimi ei voi olla suurempi kuin maksimi." };
  }

  const { count: submittedBidCount } = await supabase
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "submitted");

  const hasSubmittedBids = (submittedBidCount ?? 0) > 0;
  const nextRevision = hasSubmittedBids
    ? existing.content_revision + 1
    : existing.content_revision;

  const { error } = await supabase
    .from("projects")
    .update({
      category_id: categoryId,
      job_type_id: jobTypeId,
      title,
      description,
      municipality,
      postal_code: postalCode,
      address_line: addressLine,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      budget_min: budgetMin,
      budget_max: budgetMax,
      desired_start: desiredStart || null,
      flexibility_weeks: flexibilityWeeks,
      details: projectDetails,
      content_revision: nextRevision,
    })
    .eq("id", projectId)
    .eq("customer_id", user.id);

  if (error) {
    console.error("[updateProject] update failed:", error.code, error.message);
    return { error: formatProjectSaveError(error) };
  }

  await supabase
    .from("project_contacts")
    .update({
      contact_email: contactEmail,
      contact_phone: contactPhone,
      address_line: addressLine,
    })
    .eq("project_id", projectId);

  await supabase.from("project_trades").delete().eq("project_id", projectId);

  const { error: tradesErr } = await supabase.from("project_trades").insert(
    tradeIds.map((trade_id) => ({
      project_id: projectId,
      trade_id,
    })),
  );

  if (tradesErr) {
    return {
      error:
        "Pyyntö päivitettiin, mutta ammattien liitos epäonnistui. Yritä uudelleen.",
    };
  }

  try {
    await uploadProjectPhotosFromFormData(projectId, formData);
  } catch (photoErr) {
    const message =
      photoErr instanceof Error
        ? photoErr.message
        : "Kuvien tallennus epäonnistui.";
    const isSetupIssue =
      message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      message.includes("project_photos") ||
      message.includes("Bucket not found");

    if (!isSetupIssue) {
      return { error: `${message} Yritä uudelleen.` };
    }
    console.error("[updateProject] photos skipped:", message);
  }

  if (hasSubmittedBids && nextRevision > existing.content_revision) {
    const { data: bidders } = await supabase
      .from("bids")
      .select("contractor_id")
      .eq("project_id", projectId)
      .eq("status", "submitted");

    for (const row of bidders ?? []) {
      void userNotifyProjectUpdated({
        contractorId: row.contractor_id,
        projectTitle: title,
        projectId,
      });
    }
  }

  revalidatePath("/oma-tili");
  revalidatePath(`/remontti/${projectId}`);
  revalidatePath(`/remontti/${projectId}/muokkaa`);
  revalidatePath("/tarjoukset");
  revalidatePath(`/tarjoukset/${projectId}`);
  redirect(`/remontti/${projectId}?paivitetty=1`);
}
