import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { ListingSellerInbox } from "@/components/marketplace/listing-seller-inbox";
import { ProjectPhotosGallery } from "@/components/project/project-photos-gallery";
import { ListingChat } from "@/components/messaging/listing-chat";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { expireListingsIfNeeded } from "@/lib/expire-listings";
import {
  fetchListingInquiry,
  fetchSellerInbox,
} from "@/lib/listing-messages-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchListingPhotos } from "@/lib/listing-photos";
import { listingCategoryLabel } from "@/lib/marketplace-categories";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_listings")
    .select("title, description, municipality, price_eur")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!data) {
    return pageMetadata({
      title: "Ilmoitus",
      description: "Markkinapaikan ilmoitus.",
      path: `/markkinapaikka/ilmoitukset/${id}`,
    });
  }

  const price =
    data.price_eur != null
      ? `${data.price_eur.toLocaleString("fi-FI")} €`
      : "Hinta neuvoteltavissa";

  return pageMetadata({
    title: data.title,
    description: `${price} · ${data.municipality}. ${data.description.slice(0, 120)}…`,
    path: `/markkinapaikka/ilmoitukset/${id}`,
  });
}

export default async function MarketplaceListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ julkaistu?: string }>;
}) {
  const { id } = await params;
  const { julkaistu } = await searchParams;

  await expireListingsIfNeeded();

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("equipment_listings")
    .select(
      `
      id, title, description, price_eur, municipality, postal_code,
      condition, manufacturer, model, year_manufactured, pump_type_slug, product_category,
      seller_type, seller_id, published_at, expires_at,
      contact_email, contact_phone, address_line
    `,
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!listing) notFound();

  const user = await getSessionUser();
  const isSeller = user?.id === listing.seller_id;

  let buyerChat: Awaited<ReturnType<typeof fetchListingInquiry>> = null;
  let sellerInbox: Awaited<ReturnType<typeof fetchSellerInbox>> = [];

  if (user && isSeller) {
    const admin = createAdminClient();
    const { data: inquiries } = await supabase
      .from("listing_inquiries")
      .select("buyer_id")
      .eq("listing_id", id);

    const buyerIds = [...new Set((inquiries ?? []).map((i) => i.buyer_id))];
    const buyerLabels = new Map<string, string>();

    if (buyerIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", buyerIds);
      for (const p of profiles ?? []) {
        buyerLabels.set(p.id, p.full_name ?? "Ostaja");
      }
    }

    sellerInbox = await fetchSellerInbox(supabase, id, user.id, buyerLabels);
  } else if (user) {
    buyerChat = await fetchListingInquiry(supabase, id, user.id);
  }

  const sellerLabel =
    listing.seller_type === "customer" ? "Yksityinen myyjä" : "Myyjä";

  const expiresLabel = listing.expires_at
    ? new Date(listing.expires_at).toLocaleDateString("fi-FI")
    : null;

  const photos = await fetchListingPhotos(id);

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/markkinapaikka/ilmoitukset"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Ilmoitukset
        </Link>

        <p className="mt-4 text-xs font-medium uppercase text-stone-500">
          {listingCategoryLabel(
            listing.product_category ?? "device",
          )}{" "}
          · {listing.condition === "new" ? "Uusi" : "Käytetty"} ·{" "}
          {listing.seller_type === "customer" ? "Yksityinen myyjä" : "Yritys"}
          {expiresLabel && ` · voimassa ${expiresLabel} asti`}
        </p>
        {julkaistu === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Ilmoitus julkaistu onnistuneesti.
          </p>
        )}

        <h1 className="mt-1 text-2xl font-bold">{listing.title}</h1>
        <p className="mt-2 text-2xl font-bold text-sky-800">
          {listing.price_eur != null
            ? `${listing.price_eur.toLocaleString("fi-FI")} €`
            : "Hinta neuvoteltavissa"}
        </p>
        <p className="text-stone-500">
          {listing.municipality}, {listing.postal_code}
        </p>

        {photos.length > 0 && (
          <div className="mt-8">
            <ProjectPhotosGallery photos={photos} title="Kuvat" />
          </div>
        )}

        <div className="mt-8 whitespace-pre-wrap rounded-xl border border-stone-200 bg-white p-6 text-sm">
          {listing.description}
        </div>

        {(listing.manufacturer || listing.model || listing.year_manufactured) && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {listing.manufacturer && (
              <div>
                <dt className="text-stone-500">Valmistaja</dt>
                <dd className="font-medium">{listing.manufacturer}</dd>
              </div>
            )}
            {listing.model && (
              <div>
                <dt className="text-stone-500">Malli</dt>
                <dd className="font-medium">{listing.model}</dd>
              </div>
            )}
            {listing.year_manufactured && (
              <div>
                <dt className="text-stone-500">Vuosi</dt>
                <dd className="font-medium">{listing.year_manufactured}</dd>
              </div>
            )}
          </dl>
        )}

        {!isSeller && (
          <section className="mt-8 rounded-xl border border-sky-200 bg-sky-50/60 p-6">
            <h2 className="font-semibold text-sky-950">Ota yhteyttä myyjään</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-stone-500">Sähköposti</dt>
                <dd>
                  <a
                    href={`mailto:${listing.contact_email}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {listing.contact_email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Puhelin</dt>
                <dd>
                  <a
                    href={`tel:${listing.contact_phone.replace(/\s/g, "")}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {listing.contact_phone}
                  </a>
                </dd>
              </div>
              {listing.address_line && (
                <div>
                  <dt className="text-stone-500">Nouto / sijainti</dt>
                  <dd className="font-medium">{listing.address_line}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {isSeller && user && (
          <ListingSellerInbox
            listingId={id}
            inquiries={sellerInbox}
            currentUserId={user.id}
            sellerLabel={sellerLabel}
          />
        )}

        {!isSeller && user && buyerChat !== null && (
          <ListingChat
            listingId={id}
            inquiryId={buyerChat.inquiry.id || null}
            messages={buyerChat.messages}
            currentUserId={user.id}
            buyerId={user.id}
            sellerLabel={sellerLabel}
          />
        )}

        {!isSeller && !user && (
          <p className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-sm">
            <Link
              href={`/kirjaudu?redirect=/markkinapaikka/ilmoitukset/${id}`}
              className="font-medium text-sky-700 hover:underline"
            >
              Kirjaudu sisään
            </Link>{" "}
            lähettääksesi viestin myyjälle sovelluksen kautta.
          </p>
        )}
      </main>
    </div>
  );
}
