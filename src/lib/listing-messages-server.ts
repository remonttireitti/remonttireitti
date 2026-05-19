import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ListingInquiry = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
};

export async function fetchListingInquiry(
  supabase: SupabaseClient,
  listingId: string,
  userId: string,
): Promise<{
  inquiry: ListingInquiry;
  messages: ListingChatMessage[];
} | null> {
  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .single();

  if (!listing || listing.status !== "published") return null;

  if (listing.seller_id === userId) return null;

  const { data: inquiry } = await supabase
    .from("listing_inquiries")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (!inquiry) {
    return {
      inquiry: {
        id: "",
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id,
      },
      messages: [],
    };
  }

  const { data: messages } = await supabase
    .from("listing_messages")
    .select("id, sender_id, body, created_at")
    .eq("inquiry_id", inquiry.id)
    .order("created_at", { ascending: true });

  return {
    inquiry,
    messages: (messages ?? []) as ListingChatMessage[],
  };
}

export async function fetchSellerInbox(
  supabase: SupabaseClient,
  listingId: string,
  sellerId: string,
  buyerLabels: Map<string, string>,
) {
  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("seller_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.seller_id !== sellerId) return [];

  const { data: inquiries } = await supabase
    .from("listing_inquiries")
    .select("id, buyer_id, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (!inquiries?.length) return [];

  const result = [];
  for (const inq of inquiries) {
    const { data: messages } = await supabase
      .from("listing_messages")
      .select("id, sender_id, body, created_at")
      .eq("inquiry_id", inq.id)
      .order("created_at", { ascending: true });

    result.push({
      inquiryId: inq.id,
      buyerId: inq.buyer_id,
      buyerLabel: buyerLabels.get(inq.buyer_id) ?? "Ostaja",
      messages: (messages ?? []) as ListingChatMessage[],
    });
  }

  return result;
}
