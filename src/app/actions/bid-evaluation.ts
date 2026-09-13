"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadBidEvaluationFiles } from "@/lib/bid-evaluation-files";
import {
  BID_EVALUATION_DIMENSIONS,
  computeEvaluationQuoteCents,
  parseEvaluationCategory,
  type BidEvaluationCategory,
  type BidEvaluationPricingMode,
  type BidEvaluationVerdict,
} from "@/lib/bid-evaluation";
import { parseEvaluatorScopesFromFormData } from "@/lib/evaluator-scopes";
import {
  evaluatorCanReviewCategory,
  isEvaluatorAcceptingReviews,
  requireEvaluator,
} from "@/lib/evaluator";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";

export type BidEvaluationActionState = { error?: string; ok?: string };

async function requireCustomerId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjousarvio");
  return user.id;
}

function parseVerdict(raw: string): BidEvaluationVerdict | null {
  if (["good", "fair", "ask_clarification", "caution"].includes(raw)) {
    return raw as BidEvaluationVerdict;
  }
  return null;
}

export async function createBidEvaluationRequest(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const customerId = await requireCustomerId();
  const category = parseEvaluationCategory(
    String(formData.get("category") ?? "lammitys"),
  );
  const heatPumpType = String(formData.get("heat_pump_type") ?? "").trim() || null;
  const contextNotes = String(formData.get("context_notes") ?? "").trim() || null;
  const projectId = String(formData.get("project_id") ?? "").trim() || null;

  const isHeatPumpCategory =
    category === "heat_pump" || category === "lammitys";

  if (isHeatPumpCategory && heatPumpType) {
    if (!HEAT_PUMP_JOB_SLUGS.includes(heatPumpType as (typeof HEAT_PUMP_JOB_SLUGS)[number])) {
      return { error: "Valitse kelvollinen pumpputyyppi." };
    }
  }

  const supabase = await createClient();

  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!project) return { error: "Urakkaa ei löydy." };
  }

  const { data, error } = await supabase
    .from("bid_evaluation_requests")
    .insert({
      customer_id: customerId,
      project_id: projectId,
      category,
      heat_pump_type: isHeatPumpCategory ? heatPumpType : null,
      context_notes: contextNotes,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Pyynnön luonti epäonnistui." };

  redirect(`/tarjousarvio/${data.id}/muokkaa`);
}

export async function addEvaluationItem(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const customerId = await requireCustomerId();
  const requestId = String(formData.get("request_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const deviceBrand = String(formData.get("device_brand") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amountEuros = String(formData.get("amount_euros") ?? "").trim();
  const bidId = String(formData.get("bid_id") ?? "").trim() || null;
  const source = bidId ? "platform" : "external";

  if (!requestId || label.length < 2) {
    return { error: "Anna tarjoukselle tunniste (esim. Tarjous A)." };
  }

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("bid_evaluation_requests")
    .select("id, status, customer_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.customer_id !== customerId) {
    return { error: "Pyyntöä ei löydy." };
  }
  if (request.status !== "draft") {
    return { error: "Voit lisätä tarjouksia vain luonnokseen." };
  }

  const { count } = await supabase
    .from("bid_evaluation_items")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);

  if ((count ?? 0) >= 5) return { error: "Enintään 5 tarjousta per pyyntö." };

  let amountCents: number | null = null;
  if (amountEuros) {
    const euros = Number(amountEuros);
    if (!Number.isFinite(euros) || euros <= 0) {
      return { error: "Hinta on virheellinen." };
    }
    amountCents = Math.round(euros * 100);
  }

  const { data: item, error } = await supabase
    .from("bid_evaluation_items")
    .insert({
      request_id: requestId,
      sort_order: count ?? 0,
      source,
      bid_id: bidId,
      label,
      amount_cents: amountCents,
      device_brand: deviceBrand,
      notes,
    })
    .select("id")
    .single();

  if (error || !item) return { error: "Tarjouksen lisäys epäonnistui." };

  const files = formData
    .getAll("bid_files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (source === "external" && files.length === 0 && !amountCents) {
    await supabase.from("bid_evaluation_items").delete().eq("id", item.id);
    return { error: "Liitä tarjous PDF:nä/kuvana tai anna hinta." };
  }

  try {
    if (files.length > 0) {
      await uploadBidEvaluationFiles(item.id, files);
    }
  } catch (e) {
    await supabase.from("bid_evaluation_items").delete().eq("id", item.id);
    return { error: e instanceof Error ? e.message : "Tiedoston lataus epäonnistui." };
  }

  revalidatePath(`/tarjousarvio/${requestId}/muokkaa`);
  return { ok: "Tarjous lisätty." };
}

export async function submitBidEvaluationRequest(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const customerId = await requireCustomerId();
  const requestId = String(formData.get("request_id") ?? "");

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("bid_evaluation_requests")
    .select("id, status, customer_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.customer_id !== customerId) {
    return { error: "Pyyntöä ei löydy." };
  }
  if (request.status !== "draft") {
    return { error: "Pyyntö on jo lähetetty." };
  }

  const { count } = await supabase
    .from("bid_evaluation_items")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);

  if ((count ?? 0) < 1) {
    return { error: "Lisää vähintään yksi tarjous ennen lähettämistä." };
  }

  const { data: settingsRow } = await supabase
    .from("bid_evaluation_settings")
    .select("pricing_mode, price_per_bid_cents")
    .eq("id", 1)
    .maybeSingle();

  const settings = {
    pricing_mode: (settingsRow?.pricing_mode ?? "free") as BidEvaluationPricingMode,
    price_per_bid_cents: (settingsRow?.price_per_bid_cents as number | null) ?? null,
  };
  const quotedTotalCents = computeEvaluationQuoteCents(settings, count ?? 0);

  const { error } = await supabase
    .from("bid_evaluation_requests")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      quoted_total_cents: quotedTotalCents,
    })
    .eq("id", requestId);

  if (error) return { error: "Lähetys epäonnistui." };

  revalidatePath(`/tarjousarvio/${requestId}`);
  revalidatePath("/arvioija");
  redirect(`/tarjousarvio/${requestId}?lahetetty=1`);
}

export async function claimEvaluationRequest(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");

  await requireEvaluator();

  const requestId = String(formData.get("request_id") ?? "");
  const { data: request } = await supabase
    .from("bid_evaluation_requests")
    .select("id, category, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { error: "Pyyntöä ei löydy." };
  if (request.status !== "submitted") {
    return { error: "Pyyntö ei ole jonossa." };
  }

  const canReview = await evaluatorCanReviewCategory(
    user.id,
    request.category as BidEvaluationCategory,
  );
  if (!canReview) return { error: "Ei oikeutta tähän kategoriaan." };

  const accepting = await isEvaluatorAcceptingReviews(user.id);
  if (!accepting) {
    return {
      error:
        "Olet merkinnyt ettei sinua tällä hetkellä sopiva arvioija. Poista merkintä ennen uuden pyynnön ottamista.",
    };
  }

  const { error: updateErr } = await supabase
    .from("bid_evaluation_requests")
    .update({
      status: "in_review",
      assigned_evaluator_id: user.id,
    })
    .eq("id", requestId);

  if (updateErr) return { error: "Ottaminen epäonnistui." };

  const { error: reviewErr } = await supabase.from("bid_evaluation_reviews").insert({
    request_id: requestId,
    evaluator_id: user.id,
  });

  if (reviewErr) return { error: "Arvion luonti epäonnistui." };

  revalidatePath("/arvioija");
  redirect(`/arvioija/${requestId}`);
}

export async function submitEvaluationReview(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");

  await requireEvaluator();

  const requestId = String(formData.get("request_id") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const questions = String(formData.get("questions_for_contractor") ?? "").trim() || null;

  if (summary.length < 20) {
    return { error: "Kirjoita asiakkaalle näkyvä yhteenveto (väh. 20 merkkiä)." };
  }

  const { data: request } = await supabase
    .from("bid_evaluation_requests")
    .select("id, category, status, assigned_evaluator_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "in_review") {
    return { error: "Pyyntö ei ole arvioinnissa." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (request.assigned_evaluator_id !== user.id && profile?.role !== "admin") {
    return { error: "Et ole ottanut tätä arvioitavaksi." };
  }

  const { data: review } = await supabase
    .from("bid_evaluation_reviews")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (!review) return { error: "Arviota ei löydy." };

  const { data: items } = await supabase
    .from("bid_evaluation_items")
    .select("id")
    .eq("request_id", requestId);

  for (const item of items ?? []) {
    for (const dim of BID_EVALUATION_DIMENSIONS) {
      const scoreRaw = String(formData.get(`score_${item.id}_${dim.id}`) ?? "");
      const verdictRaw = String(formData.get(`verdict_${item.id}_${dim.id}`) ?? "");
      const note = String(formData.get(`note_${item.id}_${dim.id}`) ?? "").trim() || null;
      const score = scoreRaw ? Number(scoreRaw) : null;
      const verdict = parseVerdict(verdictRaw);

      if (dim.id === "overall" && !verdict) {
        return { error: `Anna kokonaisarvio tarjoukselle ${item.id.slice(0, 8)}…` };
      }

      if (score != null && (score < 1 || score > 5)) {
        return { error: "Pisteiden tulee olla 1–5." };
      }

      await supabase.from("bid_evaluation_item_scores").upsert(
        {
          review_id: review.id,
          item_id: item.id,
          dimension: dim.id,
          score: score && score >= 1 && score <= 5 ? score : null,
          verdict,
          note,
        },
        { onConflict: "review_id,item_id,dimension" },
      );
    }
  }

  const now = new Date().toISOString();
  await supabase
    .from("bid_evaluation_reviews")
    .update({
      summary,
      questions_for_contractor: questions,
      completed_at: now,
    })
    .eq("id", review.id);

  await supabase
    .from("bid_evaluation_requests")
    .update({ status: "completed", completed_at: now })
    .eq("id", requestId);

  revalidatePath(`/tarjousarvio/${requestId}`);
  revalidatePath("/arvioija");
  redirect(`/arvioija?valmis=1`);
}

export async function setEvaluatorScopes(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const { requireAdmin } = await import("@/lib/admin");
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Käyttäjä puuttuu." };

  const selectedScopes = parseEvaluatorScopesFromFormData(formData);
  const admin = createAdminClient();

  const { error: deleteErr } = await admin
    .from("evaluator_scopes")
    .delete()
    .eq("evaluator_id", userId);

  if (deleteErr) {
    return {
      error:
        "Arvioijaoikeuksien poisto epäonnistui. Aja migraatio 20260913170000_evaluator_scope_areas.sql.",
    };
  }

  if (selectedScopes.length > 0) {
    const scopes = selectedScopes.map((scope) => ({
      evaluator_id: userId,
      scope,
    }));
    const { error } = await admin.from("evaluator_scopes").insert(scopes);
    if (error) {
      const hint = error.message.includes("evaluator_scopes")
        ? " Aja migraatio 20260913170000_evaluator_scope_areas.sql Supabasessa."
        : "";
      return { error: `Arvioijaoikeuksien tallennus epäonnistui.${hint}` };
    }
  }

  revalidatePath("/admin");
  return { ok: "Arvioija-asetukset päivitetty." };
}

export async function setEvaluatorAvailability(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  await requireEvaluator();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");

  const accepting = formData.get("accepting_reviews") === "on";
  const note =
    String(formData.get("unavailable_note") ?? "").trim() || null;

  if (!accepting && !note) {
    return { error: "Kerro lyhyesti miksi et ota arviointeja (esim. loma, ruuhka)." };
  }

  const { error } = await supabase.from("evaluator_profiles").upsert(
    {
      evaluator_id: user.id,
      accepting_reviews: accepting,
      unavailable_note: accepting ? null : note,
      unavailable_set_by: accepting ? null : "self",
    },
    { onConflict: "evaluator_id" },
  );

  if (error) return { error: "Saatavuuden tallennus epäonnistui." };

  revalidatePath("/arvioija");
  return { ok: accepting ? "Otat taas vastaan arviointipyyntöjä." : "Merkitty poissaolevaksi." };
}

export async function setEvaluatorAvailabilityAdmin(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const { requireAdmin } = await import("@/lib/admin");
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const accepting = formData.get("accepting_reviews") === "on";
  const note =
    String(formData.get("unavailable_note") ?? "").trim() || null;

  if (!userId) return { error: "Käyttäjä puuttuu." };
  if (!accepting && !note) {
    return { error: "Anna syy miksi arvioija ei ole saatavilla." };
  }

  const admin = createAdminClient();

  if (accepting) {
    await admin.from("evaluator_profiles").delete().eq("evaluator_id", userId);
  } else {
    const { error } = await admin.from("evaluator_profiles").upsert(
      {
        evaluator_id: userId,
        accepting_reviews: false,
        unavailable_note: note,
        unavailable_set_by: "admin",
      },
      { onConflict: "evaluator_id" },
    );
    if (error) return { error: "Arvioijan saatavuuden tallennus epäonnistui." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tarjousvahti");
  return { ok: "Arvioijan saatavuus päivitetty." };
}

export async function releaseEvaluationRequest(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");

  await requireEvaluator();

  const requestId = String(formData.get("request_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length < 10) {
    return { error: "Kerro lyhyesti miksi et ole sopiva tälle pyynnölle (väh. 10 merkkiä)." };
  }

  const { data: request } = await supabase
    .from("bid_evaluation_requests")
    .select("id, status, assigned_evaluator_id, category")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "in_review") {
    return { error: "Pyyntö ei ole arvioinnissa." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (request.assigned_evaluator_id !== user.id && profile?.role !== "admin") {
    return { error: "Et ole ottanut tätä arvioitavaksi." };
  }

  const { data: review } = await supabase
    .from("bid_evaluation_reviews")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (review) {
    await supabase.from("bid_evaluation_item_scores").delete().eq("review_id", review.id);
    await supabase.from("bid_evaluation_reviews").delete().eq("id", review.id);
  }

  const contextAppend = `\n\n[Arvioija palautti pyynnön: ${reason}]`;

  const { data: existing } = await supabase
    .from("bid_evaluation_requests")
    .select("context_notes")
    .eq("id", requestId)
    .maybeSingle();

  await supabase
    .from("bid_evaluation_requests")
    .update({
      status: "submitted",
      assigned_evaluator_id: null,
      context_notes: `${existing?.context_notes ?? ""}${contextAppend}`.trim(),
    })
    .eq("id", requestId);

  revalidatePath("/arvioija");
  revalidatePath(`/arvioija/${requestId}`);
  redirect("/arvioija?palautettu=1");
}

export async function setBidEvaluationSettings(
  _prev: BidEvaluationActionState,
  formData: FormData,
): Promise<BidEvaluationActionState> {
  const { requireAdmin } = await import("@/lib/admin");
  await requireAdmin();

  const pricingMode = String(formData.get("pricing_mode") ?? "free");
  const priceEuros = String(formData.get("price_per_bid_euros") ?? "").trim();

  if (!["free", "paid_per_bid"].includes(pricingMode)) {
    return { error: "Virheellinen hinnoittelutapa." };
  }

  let pricePerBidCents: number | null = null;
  if (pricingMode === "paid_per_bid") {
    const euros = Number(priceEuros);
    if (!Number.isFinite(euros) || euros <= 0) {
      return { error: "Anna hinta euroina (esim. 29)." };
    }
    pricePerBidCents = Math.round(euros * 100);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("bid_evaluation_settings")
    .upsert(
      {
        id: 1,
        pricing_mode: pricingMode,
        price_per_bid_cents: pricePerBidCents,
      },
      { onConflict: "id" },
    );

  if (error) return { error: "Hinnoittelun tallennus epäonnistui." };

  revalidatePath("/admin/tarjousvahti");
  revalidatePath("/tarjousarvio");
  return { ok: "Tarjousvahti-hinnoittelu päivitetty." };
}
