"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  notifyDonationConfirmPending,
  notifyDonationConfirmed,
  notifyDonationRecipientSelected,
} from "@/lib/listing-donation-notify";
import {
  parseListingForm,
  validateListingForm,
  LISTING_DURATION_DAYS,
} from "@/lib/marketplace-listings";
import { DONATION_MAX_ACTIVE_LISTINGS } from "@/lib/marketplace-donations";
import { uploadListingPhotosFromFormData } from "@/lib/listing-photos";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { shouldOfferContractorActivation } from "@/lib/contractor-activation";
import { normalizeListingContactEmail } from "@/lib/listing-contact-email";
import { sendListingVerificationEmail } from "@/lib/listing-verification-email";
import { generateProjectAccessToken } from "@/lib/project-guest-access";
import { scheduleNotification } from "@/lib/schedule-notification";
import type { ListingActionState } from "@/app/actions/marketplace-listings";

export async function countActiveDonationListings(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count: publishedCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .eq("listing_kind", "donate")
    .eq("status", "published");

  const { count: pendingCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .eq("listing_kind", "donate")
    .eq("status", "draft")
    .eq("pending_publish", true);

  return (publishedCount ?? 0) + (pendingCount ?? 0);
}

export async function countActiveDonationListingsByEmail(
  contactEmail: string,
): Promise<number> {
  const email = normalizeListingContactEmail(contactEmail);
  const supabase = await createClient();
  const { count: publishedCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_kind", "donate")
    .eq("status", "published")
    .eq("contact_email", email);

  const { count: pendingCount } = await supabase
    .from("equipment_listings")
    .select("id", { count: "exact", head: true })
    .eq("listing_kind", "donate")
    .eq("status", "draft")
    .eq("pending_publish", true)
    .eq("contact_email", email);

  return (publishedCount ?? 0) + (pendingCount ?? 0);
}

export async function countDonationListingSlotsLeft(
  userId: string | null,
  contactEmail: string,
): Promise<number> {
  const byEmail = await countActiveDonationListingsByEmail(contactEmail);
  const slotsByEmail = DONATION_MAX_ACTIVE_LISTINGS - byEmail;
  if (!userId) return Math.max(0, slotsByEmail);

  const byUser = await countActiveDonationListings(userId);
  const slotsByUser = DONATION_MAX_ACTIVE_LISTINGS - byUser;
  return Math.max(0, Math.min(slotsByUser, slotsByEmail));
}

export async function createConsumerDonationListing(
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
            "Urakoitsijat voivat julkaista lahjoituksen yrityksenä — valitse yrityksen lahjoitus.",
        };
      }
    }

    const input = parseListingForm(formData);
    if (input.listing_kind !== "donate") {
      input.listing_kind = "donate";
    }
    const validationError = validateListingForm(input);
    if (validationError) return { error: validationError };

    const contactEmail = normalizeListingContactEmail(input.contact_email);

    if (user) {
      const activeByUser = await countActiveDonationListings(user.id);
      if (activeByUser >= DONATION_MAX_ACTIVE_LISTINGS) {
        return {
          error: `Sinulla on jo ${DONATION_MAX_ACTIVE_LISTINGS} aktiivista lahjoitusilmoitusta.`,
        };
      }
    }

    const activeByEmail = await countActiveDonationListingsByEmail(contactEmail);
    if (activeByEmail >= DONATION_MAX_ACTIVE_LISTINGS) {
      return {
        error: `Sähköpostiosoitteeseen ${contactEmail} liittyy jo ${DONATION_MAX_ACTIVE_LISTINGS} aktiivista lahjoitusilmoitusta.`,
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
      listing_kind: "donate" as const,
      condition: input.condition,
      title: input.title,
      description: input.description,
      price_eur: 0,
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
      console.error("[createConsumerDonationListing] insert", error.code, error.message);
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
      redirectPath: `/markkinapaikka/ilmoita/vahvistus?email=${encodeURIComponent(contactEmail)}${isGuest ? "&vieras=1" : ""}&lahjoitus=1`,
    };
  } catch (err) {
    console.error("[createConsumerDonationListing]", err);
    return { error: "Ilmoituksen lähetys epäonnistui. Yritä uudelleen." };
  }
}

export async function createContractorDonationListing(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Kirjaudu sisään." };
    if (!(await isContractor())) {
      return { error: "Vain urakoitsijat voivat julkaista yrityslahjoituksen." };
    }

    const input = parseListingForm(formData);
    if (input.listing_kind !== "donate") {
      input.listing_kind = "donate";
    }
    const validationError = validateListingForm(input);
    if (validationError) return { error: validationError };

    const activeByUser = await countActiveDonationListings(user.id);
    if (activeByUser >= DONATION_MAX_ACTIVE_LISTINGS) {
      return {
        error: `Sinulla on jo ${DONATION_MAX_ACTIVE_LISTINGS} aktiivista lahjoitusilmoitusta.`,
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
        seller_type: "contractor",
        plan_id: plan?.id ?? null,
        status: "published",
        listing_kind: "donate",
        condition: input.condition,
        title: input.title,
        description: input.description,
        price_eur: 0,
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
      console.error("[createContractorDonationListing] insert", error.code, error.message);
      return { error: "Julkaisu epäonnistui." };
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
  } catch (err) {
    console.error("[createContractorDonationListing]", err);
    return { error: "Ilmoituksen lähetys epäonnistui. Yritä uudelleen." };
  }
}

export async function selectDonationRecipient(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const listingId = String(formData.get("listing_id") ?? "");
  const recipientId = String(formData.get("recipient_id") ?? "");

  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("id, seller_id, title, status, listing_kind, donation_recipient_id")
    .eq("id", listingId)
    .single();

  if (
    !listing ||
    listing.seller_id !== user.id ||
    listing.listing_kind !== "donate" ||
    listing.status !== "published"
  ) {
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?virhe=ei-oikeutta`);
  }

  if (listing.donation_recipient_id) {
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?virhe=saaja-valittu`);
  }

  const { data: inquiry } = await supabase
    .from("listing_inquiries")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", recipientId)
    .maybeSingle();

  if (!inquiry) {
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?virhe=ei-yhteydenottoa`);
  }

  const { data: existing } = await supabase
    .from("listing_donation_completions")
    .select("id, status")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing && existing.status !== "rejected") {
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?virhe=saaja-valittu`);
  }

  await supabase
    .from("equipment_listings")
    .update({ donation_recipient_id: recipientId })
    .eq("id", listingId);

  if (existing) {
    await supabase
      .from("listing_donation_completions")
      .update({
        recipient_id: recipientId,
        status: "selected",
        recipient_rejected: false,
        seller_handed_over_at: null,
        recipient_confirmed_at: null,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("listing_donation_completions").insert({
      listing_id: listingId,
      seller_id: user.id,
      recipient_id: recipientId,
      status: "selected",
    });
  }

  scheduleNotification(() =>
    notifyDonationRecipientSelected({
      recipientId,
      listingId,
      listingTitle: listing.title,
    }),
  );

  revalidatePath(`/markkinapaikka/ilmoitukset/${listingId}`);
  redirect(`/markkinapaikka/ilmoitukset/${listingId}?saaja=1`);
}

export async function markDonationHandedOver(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const listingId = String(formData.get("listing_id") ?? "");

  const { data: completion } = await supabase
    .from("listing_donation_completions")
    .select("id, seller_id, recipient_id, status, listing_id")
    .eq("listing_id", listingId)
    .single();

  if (
    !completion ||
    completion.seller_id !== user.id ||
    completion.status !== "selected"
  ) {
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?virhe=tila`);
  }

  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("title")
    .eq("id", listingId)
    .single();

  const now = new Date().toISOString();

  await supabase
    .from("listing_donation_completions")
    .update({
      status: "pending_recipient",
      seller_handed_over_at: now,
    })
    .eq("id", completion.id);

  scheduleNotification(() =>
    notifyDonationConfirmPending({
      recipientId: completion.recipient_id,
      listingId,
      listingTitle: listing?.title ?? "Lahjoitus",
    }),
  );

  revalidatePath(`/markkinapaikka/ilmoitukset/${listingId}`);
  redirect(`/markkinapaikka/ilmoitukset/${listingId}?luovutettu=1`);
}

export async function confirmDonationReceived(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const completionId = String(formData.get("completion_id") ?? "");
  const confirmed = formData.get("confirmed") === "yes";

  const { data: completion } = await supabase
    .from("listing_donation_completions")
    .select("*")
    .eq("id", completionId)
    .single();

  if (
    !completion ||
    completion.recipient_id !== user.id ||
    completion.status !== "pending_recipient"
  ) {
    redirect("/markkinapaikka/ilmoitukset?virhe=kuittaus");
  }

  const listingId = completion.listing_id;

  if (!confirmed) {
    await supabase
      .from("listing_donation_completions")
      .update({
        status: "rejected",
        recipient_rejected: true,
        recipient_confirmed_at: new Date().toISOString(),
      })
      .eq("id", completionId);

    await supabase
      .from("equipment_listings")
      .update({ donation_recipient_id: null })
      .eq("id", listingId);

    revalidatePath(`/markkinapaikka/ilmoitukset/${listingId}`);
    redirect(`/markkinapaikka/ilmoitukset/${listingId}?hylatty=1`);
  }

  const now = new Date().toISOString();

  await admin
    .from("listing_donation_completions")
    .update({
      status: "confirmed",
      recipient_confirmed_at: now,
    })
    .eq("id", completionId);

  await admin
    .from("equipment_listings")
    .update({ status: "removed", donation_recipient_id: completion.recipient_id })
    .eq("id", listingId);

  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("free_donations_given")
    .eq("id", completion.seller_id)
    .single();

  const newGiven = (sellerProfile?.free_donations_given ?? 0) + 1;

  await admin
    .from("profiles")
    .update({ free_donations_given: newGiven })
    .eq("id", completion.seller_id);

  scheduleNotification(() =>
    notifyDonationConfirmed({
      sellerId: completion.seller_id,
      listingId,
      freeDonationsGiven: newGiven,
    }),
  );

  revalidatePath(`/markkinapaikka/ilmoitukset/${listingId}`);
  revalidatePath("/markkinapaikka/omat-ilmoitukset");
  redirect(`/markkinapaikka/ilmoitukset/${listingId}?kiitos=1`);
}
