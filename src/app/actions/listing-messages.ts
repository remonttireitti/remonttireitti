"use server";

import { notifyListingMessage } from "@/lib/email-notify";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ListingMessageState = { error?: string; success?: string };

export async function sendListingMessage(
  _prev: ListingMessageState,
  formData: FormData,
): Promise<ListingMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään lähettääksesi viestin." };

  const listingId = String(formData.get("listing_id") ?? "");
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (body.length < 1) return { error: "Kirjoita viesti." };
  if (body.length > 4000) return { error: "Viesti on liian pitkä." };

  let inquiry: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
  } | null = null;

  if (inquiryId) {
    const { data } = await supabase
      .from("listing_inquiries")
      .select("id, listing_id, buyer_id, seller_id")
      .eq("id", inquiryId)
      .single();
    inquiry = data;
  } else if (listingId) {
    const { data: listing } = await supabase
      .from("equipment_listings")
      .select("id, seller_id, title, status")
      .eq("id", listingId)
      .eq("status", "published")
      .single();

    if (!listing) return { error: "Ilmoitusta ei löydy." };
    if (listing.seller_id === user.id) {
      return { error: "Et voi viestiä omasta ilmoituksestasi." };
    }

    const { data: created, error: createErr } = await supabase
      .from("listing_inquiries")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.seller_id,
      })
      .select("id, listing_id, buyer_id, seller_id")
      .single();

    if (createErr && createErr.code !== "23505") {
      return { error: "Keskustelun avaus epäonnistui." };
    }

    if (created) {
      inquiry = created;
    } else {
      const { data: existing } = await supabase
        .from("listing_inquiries")
        .select("id, listing_id, buyer_id, seller_id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .single();
      inquiry = existing;
    }
  }

  if (!inquiry) return { error: "Keskustelua ei löydy." };

  if (inquiry.buyer_id !== user.id && inquiry.seller_id !== user.id) {
    return { error: "Ei oikeutta." };
  }

  const { error } = await supabase.from("listing_messages").insert({
    inquiry_id: inquiry.id,
    sender_id: user.id,
    body,
  });

  if (error) return { error: "Viestin lähetys epäonnistui." };

  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("title")
    .eq("id", inquiry.listing_id)
    .single();

  const recipientId =
    user.id === inquiry.buyer_id ? inquiry.seller_id : inquiry.buyer_id;

  void notifyListingMessage({
    recipientId,
    listingTitle: listing?.title ?? "Ilmoitus",
    listingId: inquiry.listing_id,
    preview: body,
    asSeller: recipientId === inquiry.seller_id,
  });

  revalidatePath(`/markkinapaikka/ilmoitukset/${inquiry.listing_id}`);
  return { success: "Lähetetty." };
}
