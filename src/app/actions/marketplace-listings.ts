"use server";

import {
  LISTING_DURATION_DAYS,
  parseListingForm,
  SELLER_REMOVABLE_STATUSES,
  validateListingForm,
  type EquipmentListingStatus,
} from "@/lib/marketplace-listings";
import { listingHighlightedForPlanSlug } from "@/lib/marketplace-highlight";
import {
  getActiveContractorSubscription,
  subscriptionSlotsLeft,
} from "@/lib/marketplace-subscription";
import { uploadListingPhotosFromFormData } from "@/lib/listing-photos";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { shouldOfferContractorActivation } from "@/lib/contractor-activation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CONSUMER_FREE_MAX_ACTIVE_LISTINGS,
  formatPriceFromCents,
  MARKETPLACE_INVOICE_EMAIL,
} from "@/lib/marketplace-pricing";

export type ListingActionState = { error?: string; success?: string };

export async function countActiveConsumerListings(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .eq("seller_type", "customer")
    .eq("status", "published");
  return count ?? 0;
}

export async function createConsumerListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const profile = await getProfile();
  if (shouldOfferContractorActivation(user, profile)) {
    return {
      error: "Aktivoi ensin urakoitsijatili julkaistaksesi yritysilmoituksen.",
    };
  }

  if (await isContractor()) {
    return {
      error:
        "Urakoitsijat käyttävät maksullista toria. Julkaise ilmoitus yrityksenä.",
    };
  }

  const input = parseListingForm(formData);
  const validationError = validateListingForm(input);
  if (validationError) return { error: validationError };

  if (input.price_eur !== null && (Number.isNaN(input.price_eur) || input.price_eur < 0)) {
    return { error: "Hinta on virheellinen." };
  }

  const active = await countActiveConsumerListings(user.id);
  if (active >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
    return {
      error: `Sinulla on jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta. Poista vanha tai odota sen päättymistä.`,
    };
  }

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("marketplace_plans")
    .select("id")
    .eq("slug", "consumer_free")
    .single();

  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.consumer);

  const { data, error } = await supabase
    .from("equipment_listings")
    .insert({
      seller_id: user.id,
      seller_type: "customer",
      plan_id: plan?.id ?? null,
      status: "published",
      condition: input.condition,
      title: input.title,
      description: input.description,
      price_eur: input.price_eur,
      municipality: input.municipality,
      postal_code: input.postal_code,
      address_line: input.address_line || null,
      product_category: input.product_category,
      pump_type_slug: input.pump_type_slug || null,
      manufacturer: input.manufacturer || null,
      model: input.model || null,
      year_manufactured: input.year_manufactured,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone,
      is_free_listing: true,
      published_at: now.toISOString(),
      expires_at: expires.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Ilmoituksen tallennus epäonnistui. Yritä uudelleen." };
  }

  try {
    await uploadListingPhotosFromFormData(data.id, formData);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Kuvien tallennus epäonnistui.",
    };
  }

  revalidatePath("/markkinapaikka/ilmoitukset");
  revalidatePath("/markkinapaikka/ilmoita");
  redirect(`/markkinapaikka/ilmoitukset/${data.id}?julkaistu=1`);
}

function listingInsertPayload(
  userId: string,
  input: ReturnType<typeof parseListingForm>,
  extra: Record<string, unknown>,
) {
  return {
    seller_id: userId,
    seller_type: "contractor" as const,
    condition: input.condition,
    title: input.title,
    description: input.description,
    price_eur: input.price_eur,
    municipality: input.municipality,
    postal_code: input.postal_code,
    address_line: input.address_line || null,
    product_category: input.product_category,
    pump_type_slug: input.pump_type_slug || null,
    manufacturer: input.manufacturer || null,
    model: input.model || null,
    year_manufactured: input.year_manufactured,
    contact_email: input.contact_email,
    contact_phone: input.contact_phone,
    is_free_listing: false,
    ...extra,
  };
}

export async function createContractorListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Kirjaudu sisään." };

  if (!(await isContractor())) {
    return { error: "Vain urakoitsijat voivat julkaista yritysilmoituksia." };
  }

  const billing = String(formData.get("billing_mode") ?? "");
  if (!["subscription", "single"].includes(billing)) {
    return { error: "Valitse julkaisutapa." };
  }

  const input = parseListingForm(formData);
  const validationError = validateListingForm(input);
  if (validationError) return { error: validationError };

  if (input.price_eur !== null && (Number.isNaN(input.price_eur) || input.price_eur < 0)) {
    return { error: "Hinta on virheellinen." };
  }

  const supabase = await createClient();
  const sub = await getActiveContractorSubscription(supabase, user.id);

  if (billing === "subscription") {
    if (!sub) {
      return {
        error:
          "Aktiivista kk-tilausta ei löydy. Tilaa paketti tai valitse yksittäinen ilmoitus.",
      };
    }
    if (subscriptionSlotsLeft(sub) <= 0) {
      return {
        error: `Kuukausikiintiö (${sub.plan.listing_quota_per_month} ilmoitusta) on täynnä.`,
      };
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.paid);

    const { data, error } = await supabase
      .from("equipment_listings")
      .insert(
        listingInsertPayload(user.id, input, {
          plan_id: sub.plan_id,
          subscription_id: sub.id,
          highlighted_in_search: listingHighlightedForPlanSlug(sub.plan.slug),
          status: "published",
          published_at: now.toISOString(),
          expires_at: expires.toISOString(),
        }),
      )
      .select("id")
      .single();

    if (error) return { error: "Julkaisu epäonnistui." };

    await supabase
      .from("seller_subscriptions")
      .update({
        listings_published_this_period: sub.listings_published_this_period + 1,
      })
      .eq("id", sub.id);

    revalidatePath("/markkinapaikka/ilmoitukset");
    redirect(`/markkinapaikka/ilmoitukset/${data.id}?julkaistu=1`);
  }

  const { data: plan } = await supabase
    .from("marketplace_plans")
    .select("id, name_fi, price_eur_cents")
    .eq("slug", "listing_single")
    .single();

  if (!plan) return { error: "Hinnoittelua ei löydy." };

  const { data: listing, error: listErr } = await supabase
    .from("equipment_listings")
    .insert(
      listingInsertPayload(user.id, input, {
        plan_id: plan.id,
        status: "awaiting_invoice",
      }),
    )
    .select("id")
    .single();

  if (listErr || !listing) {
    return { error: "Ilmoituksen luonti epäonnistui." };
  }

  try {
    await uploadListingPhotosFromFormData(listing.id, formData);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Kuvien tallennus epäonnistui.",
    };
  }

  const { error: billErr } = await supabase
    .from("marketplace_billing_requests")
    .insert({
      seller_id: user.id,
      kind: "listing",
      status: "pending",
      plan_id: plan.id,
      listing_id: listing.id,
      amount_eur_cents: plan.price_eur_cents,
      description_fi: `Tori: ${plan.name_fi} — ${input.title}`,
    });

  if (billErr) return { error: "Laskutuspyynnön luonti epäonnistui." };

  revalidatePath("/admin/laskutus");
  revalidatePath("/admin/markkinapaikka");
  revalidatePath("/markkinapaikka/ilmoita");
  redirect(
    `/markkinapaikka/ilmoita?lasku=1&summa=${encodeURIComponent(formatPriceFromCents(plan.price_eur_cents))}&email=${encodeURIComponent(MARKETPLACE_INVOICE_EMAIL)}`,
  );
}

export async function removeSellerListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const listingId = String(formData.get("listing_id") ?? "");
  if (!listingId) return { error: "Ilmoitus puuttuu." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("id, seller_id, status, title")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  if (!listing) {
    return { error: "Ilmoitusta ei löytynyt tai sinulla ei ole oikeutta poistaa sitä." };
  }

  const status = listing.status as EquipmentListingStatus;
  if (!SELLER_REMOVABLE_STATUSES.includes(status)) {
    return {
      error:
        status === "removed"
          ? "Ilmoitus on jo poistettu."
          : "Tätä ilmoitusta ei voi poistaa tässä vaiheessa.",
    };
  }

  const { error } = await supabase
    .from("equipment_listings")
    .update({ status: "removed" })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) {
    console.error("[removeSellerListing]", error.code, error.message);
    return { error: "Ilmoituksen poisto epäonnistui." };
  }

  revalidatePath("/markkinapaikka/ilmoitukset");
  revalidatePath("/markkinapaikka/omat-ilmoitukset");
  revalidatePath(`/markkinapaikka/ilmoitukset/${listingId}`);
  revalidatePath("/markkinapaikka/ilmoita");
  return { success: "Ilmoitus poistettu." };
}

export type SellerListingRow = {
  id: string;
  title: string;
  status: EquipmentListingStatus;
  price_eur: number | null;
  municipality: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export async function fetchSellerListings(
  userId: string,
): Promise<SellerListingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_listings")
    .select(
      "id, title, status, price_eur, municipality, published_at, expires_at, created_at",
    )
    .eq("seller_id", userId)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  return (data ?? []) as SellerListingRow[];
}
