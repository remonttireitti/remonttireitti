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
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveListingSellerAccess } from "@/lib/listing-guest-access";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { shouldOfferContractorActivation } from "@/lib/contractor-activation";
import {
  CONSUMER_FREE_MAX_ACTIVE_LISTINGS,
  formatPriceFromCents,
  MARKETPLACE_INVOICE_EMAIL,
} from "@/lib/marketplace-pricing";
import { normalizeListingContactEmail } from "@/lib/listing-contact-email";
import { sendListingVerificationEmail } from "@/lib/listing-verification-email";
import { generateProjectAccessToken } from "@/lib/project-guest-access";

export type ListingActionState = {
  error?: string;
  success?: string;
  ok?: boolean;
  redirectPath?: string;
};

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

/** Julkaistut + vahvistusta odottavat kuluttajailmoitukset samalla sähköpostilla. */
export async function countActiveConsumerListingsByEmail(
  contactEmail: string,
): Promise<number> {
  const email = normalizeListingContactEmail(contactEmail);
  const supabase = await createClient();
  const { count: publishedCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_type", "customer")
    .eq("status", "published")
    .eq("contact_email", email);

  const { count: pendingCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_type", "customer")
    .eq("status", "draft")
    .eq("pending_publish", true)
    .eq("contact_email", email);

  return (publishedCount ?? 0) + (pendingCount ?? 0);
}

export async function countConsumerListingSlotsLeft(
  userId: string,
  contactEmail: string,
): Promise<number> {
  const [byUser, byEmail] = await Promise.all([
    countActiveConsumerListings(userId),
    countActiveConsumerListingsByEmail(contactEmail),
  ]);
  const slotsByUser = CONSUMER_FREE_MAX_ACTIVE_LISTINGS - byUser;
  const slotsByEmail = CONSUMER_FREE_MAX_ACTIVE_LISTINGS - byEmail;
  return Math.max(0, Math.min(slotsByUser, slotsByEmail));
}

export async function createConsumerListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  try {
    const user = await getSessionUser();
    const isGuest = !user;

    if (user) {
      const profile = await getProfile();
      if (shouldOfferContractorActivation(user, profile)) {
        return {
          error:
            "Aktivoi ensin urakoitsijatili julkaistaksesi yritysilmoituksen.",
        };
      }

      if (await isContractor()) {
        return {
          error:
            "Urakoitsijat käyttävät maksullista toria. Julkaise ilmoitus yrityksenä.",
        };
      }
    }

    const input = parseListingForm(formData);
    const validationError = validateListingForm(input);
    if (validationError) return { error: validationError };

    if (
      input.price_eur !== null &&
      (Number.isNaN(input.price_eur) || input.price_eur < 0)
    ) {
      return { error: "Hinta on virheellinen." };
    }

    const contactEmail = normalizeListingContactEmail(input.contact_email);

    if (user) {
      const activeByUser = await countActiveConsumerListings(user.id);
      if (activeByUser >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
        return {
          error: `Sinulla on jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta. Poista vanha tai odota sen päättymistä.`,
        };
      }
    }

    const activeByEmail = await countActiveConsumerListingsByEmail(contactEmail);
    if (activeByEmail >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
      return {
        error: `Sähköpostiosoitteeseen ${contactEmail} liittyy jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta.`,
      };
    }

    const readClient = await createClient();
    const { data: plan } = await readClient
      .from("marketplace_plans")
      .select("id")
      .eq("slug", "consumer_free")
      .single();

    const { raw, hash } = generateProjectAccessToken();

    const baseInsert = {
      seller_type: "customer" as const,
      plan_id: plan?.id ?? null,
      status: "draft" as const,
      pending_publish: true,
      listing_kind: input.listing_kind,
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
      contact_email: contactEmail,
      contact_phone: input.contact_phone,
      is_free_listing: true,
      verification_token_hash: hash,
      published_at: null,
      expires_at: null,
    };

    const writeClient = isGuest ? createAdminClient() : readClient;
    const { data, error } = isGuest
      ? await writeClient
          .from("equipment_listings")
          .insert({
            ...baseInsert,
            seller_id: null,
            guest_seller_email: contactEmail,
          })
          .select("id")
          .single()
      : await writeClient
          .from("equipment_listings")
          .insert({
            ...baseInsert,
            seller_id: user!.id,
            guest_seller_email: null,
          })
          .select("id")
          .single();

    if (error) {
      console.error("[createConsumerListing] insert", error.code, error.message);
      return { error: "Ilmoituksen tallennus epäonnistui. Yritä uudelleen." };
    }

    try {
      await uploadListingPhotosFromFormData(data.id, formData);
    } catch (e) {
      await writeClient.from("equipment_listings").delete().eq("id", data.id);
      return {
        error: e instanceof Error ? e.message : "Kuvien tallennus epäonnistui.",
      };
    }

    const mailResult = await sendListingVerificationEmail({
      to: contactEmail,
      listingTitle: input.title,
      listingId: data.id,
      rawToken: raw,
    });

    if (!mailResult.ok && !mailResult.skipped) {
      await writeClient.from("equipment_listings").delete().eq("id", data.id);
      return {
        error:
          "Vahvistussähköpostin lähetys epäonnistui. Tarkista osoite ja yritä uudelleen.",
      };
    }

    return {
      ok: true,
      redirectPath: `/markkinapaikka/ilmoita/vahvistus?email=${encodeURIComponent(contactEmail)}${isGuest ? "&vieras=1" : ""}`,
    };
  } catch (err) {
    console.error("[createConsumerListing]", err);
    return { error: "Ilmoituksen lähetys epäonnistui. Yritä uudelleen." };
  }
}

function listingInsertPayload(
  userId: string,
  input: ReturnType<typeof parseListingForm>,
  extra: Record<string, unknown>,
) {
  return {
    seller_id: userId,
    seller_type: "contractor" as const,
    listing_kind: input.listing_kind,
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
  try {
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

    if (
      input.price_eur !== null &&
      (Number.isNaN(input.price_eur) || input.price_eur < 0)
    ) {
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

      if (error) {
        console.error(
          "[createContractorListing] subscription insert",
          error.code,
          error.message,
        );
        return { error: "Julkaisu epäonnistui." };
      }

      const admin = tryCreateAdminClient();
      const counterClient = admin ?? supabase;
      const { error: counterErr } = await counterClient
        .from("seller_subscriptions")
        .update({
          listings_published_this_period: sub.listings_published_this_period + 1,
        })
        .eq("id", sub.id);

      if (counterErr) {
        console.error(
          "[createContractorListing] subscription counter",
          counterErr.code,
          counterErr.message,
        );
      }

      try {
        await uploadListingPhotosFromFormData(data.id, formData);
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Kuvien tallennus epäonnistui.",
        };
      }

      return {
        ok: true,
        redirectPath: `/markkinapaikka/ilmoitukset/${data.id}?julkaistu=1`,
      };
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
      console.error(
        "[createContractorListing] single insert",
        listErr?.code,
        listErr?.message,
      );
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

    if (billErr) {
      console.error("[createContractorListing] billing", billErr.code, billErr.message);
      return { error: "Laskutuspyynnön luonti epäonnistui." };
    }

    return {
      ok: true,
      redirectPath: `/markkinapaikka/ilmoita?lasku=1&summa=${encodeURIComponent(formatPriceFromCents(plan.price_eur_cents))}&email=${encodeURIComponent(MARKETPLACE_INVOICE_EMAIL)}`,
    };
  } catch (err) {
    console.error("[createContractorListing]", err);
    return { error: "Ilmoituksen lähetys epäonnistui. Yritä uudelleen." };
  }
}

async function hasPendingListingBilling(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("marketplace_billing_requests")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .in("status", ["pending", "invoiced"]);

  return (count ?? 0) > 0;
}

export async function renewExpiredListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Kirjaudu sisään." };

    const listingId = String(formData.get("listing_id") ?? "");
    if (!listingId) return { error: "Ilmoitus puuttuu." };

    const supabase = await createClient();
    const { data: listing } = await supabase
      .from("equipment_listings")
      .select("id, seller_id, seller_type, status, title")
      .eq("id", listingId)
      .eq("seller_id", user.id)
      .single();

    if (!listing) return { error: "Ilmoitusta ei löydy." };
    if (listing.status !== "expired") {
      return { error: "Vain vanhentunutta ilmoitusta voi uusia." };
    }

    if (await hasPendingListingBilling(supabase, listingId)) {
      return {
        error:
          "Ilmoituksella on jo odottava laskutuspyyntö. Odota laskua tai ota yhteyttä tukeen.",
      };
    }

    const now = new Date();

    if (listing.seller_type === "customer") {
      const { data: listingEmailRow } = await supabase
        .from("equipment_listings")
        .select("contact_email")
        .eq("id", listingId)
        .single();

      const contactEmail = normalizeListingContactEmail(
        listingEmailRow?.contact_email ?? user.email ?? "",
      );

      const activeByUser = await countActiveConsumerListings(user.id);
      if (activeByUser >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
        return {
          error: `Sinulla on jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta. Poista vanha ennen uusimista.`,
        };
      }

      const activeByEmail = await countActiveConsumerListingsByEmail(contactEmail);
      if (activeByEmail >= CONSUMER_FREE_MAX_ACTIVE_LISTINGS) {
        return {
          error: `Sähköpostiosoitteeseen ${contactEmail} liittyy jo ${CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta.`,
        };
      }

      const expires = new Date(now);
      expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.consumer);

      const { error } = await supabase
        .from("equipment_listings")
        .update({
          status: "published",
          published_at: now.toISOString(),
          expires_at: expires.toISOString(),
        })
        .eq("id", listingId);

      if (error) {
        console.error("[renewExpiredListing] consumer", error.code, error.message);
        return { error: "Uusiminen epäonnistui." };
      }

      return {
        ok: true,
        redirectPath: `/markkinapaikka/ilmoitukset/${listingId}?uusittu=1`,
      };
    }

    if (!(await isContractor())) {
      return { error: "Vain urakoitsija voi uusia yritysilmoituksen." };
    }

    const billing = String(formData.get("billing_mode") ?? "subscription");
    const sub = await getActiveContractorSubscription(supabase, user.id);
    const canUseSubscription = Boolean(sub && subscriptionSlotsLeft(sub) > 0);

    if (billing === "subscription" && canUseSubscription && sub) {
      const expires = new Date(now);
      expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.paid);

      const { error } = await supabase
        .from("equipment_listings")
        .update({
          status: "published",
          published_at: now.toISOString(),
          expires_at: expires.toISOString(),
          subscription_id: sub.id,
          plan_id: sub.plan_id,
          highlighted_in_search: listingHighlightedForPlanSlug(sub.plan.slug),
        })
        .eq("id", listingId);

      if (error) {
        console.error(
          "[renewExpiredListing] subscription",
          error.code,
          error.message,
        );
        return { error: "Uusiminen epäonnistui." };
      }

      const admin = tryCreateAdminClient();
      const counterClient = admin ?? supabase;
      const { error: counterErr } = await counterClient
        .from("seller_subscriptions")
        .update({
          listings_published_this_period: sub.listings_published_this_period + 1,
        })
        .eq("id", sub.id);

      if (counterErr) {
        console.error(
          "[renewExpiredListing] subscription counter",
          counterErr.code,
          counterErr.message,
        );
      }

      return {
        ok: true,
        redirectPath: `/markkinapaikka/ilmoitukset/${listingId}?uusittu=1`,
      };
    }

    if (billing === "subscription" && !canUseSubscription) {
      return {
        error:
          "Kk-tilauksen ilmoituspaikat ovat loppu. Valitse yksittäinen uusiminen tai tilaa lisää kapasiteettia.",
      };
    }

    const { data: plan } = await supabase
      .from("marketplace_plans")
      .select("id, name_fi, price_eur_cents")
      .eq("slug", "listing_single")
      .single();

    if (!plan) return { error: "Hinnoittelua ei löydy." };

    const { error: billErr } = await supabase
      .from("marketplace_billing_requests")
      .insert({
        seller_id: user.id,
        kind: "listing_renewal",
        status: "pending",
        plan_id: plan.id,
        listing_id: listingId,
        amount_eur_cents: plan.price_eur_cents,
        description_fi: `Tori: uusiminen — ${listing.title}`,
      });

    if (billErr) {
      console.error("[renewExpiredListing] billing", billErr.code, billErr.message);
      return { error: "Laskutuspyynnön luonti epäonnistui." };
    }

    return {
      ok: true,
      redirectPath: `/markkinapaikka/ilmoitukset/${listingId}?lasku=1&summa=${encodeURIComponent(formatPriceFromCents(plan.price_eur_cents))}&email=${encodeURIComponent(MARKETPLACE_INVOICE_EMAIL)}`,
    };
  } catch (err) {
    console.error("[renewExpiredListing]", err);
    return { error: "Uusiminen epäonnistui. Yritä uudelleen." };
  }
}

export async function removeSellerListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const listingId = String(formData.get("listing_id") ?? "");
  if (!listingId) return { error: "Ilmoitus puuttuu." };

  const access = await resolveListingSellerAccess(listingId);
  if (!access) return { error: "Kirjaudu sisään tai avaa ilmoitus sähköpostilinkistä." };

  const readClient = await createClient();
  const admin = access.kind === "guest" ? createAdminClient() : null;
  const writeClient = admin ?? readClient;

  const listingQuery = readClient
    .from("equipment_listings")
    .select("id, seller_id, status, title, pending_publish, guest_seller_email")
    .eq("id", listingId);

  const { data: listing } =
    access.kind === "user"
      ? await listingQuery.eq("seller_id", access.userId).single()
      : await (admin ?? readClient)
          .from("equipment_listings")
          .select("id, seller_id, status, title, pending_publish, guest_seller_email")
          .eq("id", listingId)
          .eq("guest_seller_email", access.guestEmail)
          .single();

  if (!listing) {
    return { error: "Ilmoitusta ei löytynyt tai sinulla ei ole oikeutta poistaa sitä." };
  }

  const status = listing.status as EquipmentListingStatus;
  const pendingVerification =
    status === "draft" && Boolean(listing.pending_publish);

  if (!SELLER_REMOVABLE_STATUSES.includes(status) && !pendingVerification) {
    return {
      error:
        status === "removed"
          ? "Ilmoitus on jo poistettu."
          : "Tätä ilmoitusta ei voi poistaa tässä vaiheessa.",
    };
  }

  if (pendingVerification) {
    const deleteQuery = writeClient
      .from("equipment_listings")
      .delete()
      .eq("id", listingId);
    const { error: delErr } =
      access.kind === "user"
        ? await deleteQuery.eq("seller_id", access.userId)
        : await deleteQuery.eq("guest_seller_email", access.guestEmail);

    if (delErr) {
      console.error("[removeSellerListing] pending delete", delErr.message);
      return { error: "Ilmoituksen poisto epäonnistui." };
    }
    return { success: "Ilmoitus poistettu." };
  }

  const updateQuery = writeClient
    .from("equipment_listings")
    .update({ status: "removed" })
    .eq("id", listingId);
  const { error } =
    access.kind === "user"
      ? await updateQuery.eq("seller_id", access.userId)
      : await updateQuery.eq("guest_seller_email", access.guestEmail);

  if (error) {
    console.error("[removeSellerListing]", error.code, error.message);
    return { error: "Ilmoituksen poisto epäonnistui." };
  }

  return { success: "Ilmoitus poistettu." };
}

export type SellerListingRow = {
  id: string;
  title: string;
  status: EquipmentListingStatus;
  pending_publish: boolean;
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
      "id, title, status, pending_publish, price_eur, municipality, published_at, expires_at, created_at",
    )
    .eq("seller_id", userId)
    .or(
      "status.neq.draft,and(status.eq.draft,pending_publish.eq.true)",
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as SellerListingRow[];
}
