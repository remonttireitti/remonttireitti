import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/lib/brand-theme";
import { RemoveListingButton } from "@/components/marketplace/remove-listing-button";
import { RenewListingForm } from "@/components/marketplace/renew-listing-form";
import { ListingSellerInbox } from "@/components/marketplace/listing-seller-inbox";
import {
  ListingDonationRecipientPanel,
  ListingDonationSelectedNotice,
  ListingDonationSellerPanel,
} from "@/components/marketplace/listing-donation-panel";
import type { ListingDonationCompletion } from "@/lib/marketplace-donations";
import {
  listingStatusLabels,
  sellerListingStatusLabel,
  SELLER_REMOVABLE_STATUSES,
  type EquipmentListingStatus,
} from "@/lib/marketplace-listings";
import { LISTING_DURATION_WEEKS } from "@/lib/marketplace-pricing";
import { ProjectPhotosGallery } from "@/components/project/project-photos-gallery";
import { ListingChat } from "@/components/messaging/listing-chat";
import { ListingInstallCta } from "@/components/marketplace/listing-install-cta";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import {
  getActiveContractorSubscription,
  subscriptionSlotsLeft,
} from "@/lib/marketplace-subscription";
import { MARKETPLACE_INVOICE_EMAIL } from "@/lib/marketplace-pricing";
import { expireListingsIfNeeded } from "@/lib/expire-listings";
import {
  fetchListingInquiry,
  fetchSellerInbox,
} from "@/lib/listing-messages-server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { fetchListingPhotos } from "@/lib/listing-photos";
import { listingCategoryLabel } from "@/lib/marketplace-categories";
import { formatDeviceTypeLabel } from "@/lib/marketplace-device-types";
import { fetchListingForDetailPage } from "@/lib/marketplace-listing-detail-server";
import { resolveListingSellerAccess } from "@/lib/listing-guest-access";
import { ShareLinkPanel } from "@/components/ui/share-link-panel";
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
  searchParams: Promise<{
    julkaistu?: string;
    uusittu?: string;
    lasku?: string;
    summa?: string;
    virhe?: string;
    saaja?: string;
    luovutettu?: string;
    kiitos?: string;
    hylatty?: string;
  }>;
}) {
  const { id } = await params;
  const { julkaistu, uusittu, lasku, summa, virhe, saaja, luovutettu, kiitos, hylatty } =
    await searchParams;

  await expireListingsIfNeeded();

  const user = await getSessionUser();
  const supabase = await createClient();
  const listing = await fetchListingForDetailPage(id);

  if (!listing) notFound();

  const sellerAccess = await resolveListingSellerAccess(id);
  const isSeller = Boolean(sellerAccess);
  const status = listing.status as EquipmentListingStatus;

  if (status !== "published" && !isSeller) {
    notFound();
  }

  let buyerChat: Awaited<ReturnType<typeof fetchListingInquiry>> = null;
  let sellerInbox: Awaited<ReturnType<typeof fetchSellerInbox>> = [];

  if (user && isSeller) {
    const admin = tryCreateAdminClient();
    const { data: inquiries } = await supabase
      .from("listing_inquiries")
      .select("buyer_id")
      .eq("listing_id", id);

    const buyerIds = [...new Set((inquiries ?? []).map((i) => i.buyer_id))];
    const buyerLabels = new Map<string, string>();

    if (admin && buyerIds.length > 0) {
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

  const pendingVerification =
    status === "draft" && Boolean(listing.pending_publish);
  const canRemove =
    isSeller &&
    (SELLER_REMOVABLE_STATUSES.includes(status) || pendingVerification);
  const isPublic = status === "published";

  let subscriptionSlots = 0;
  let subscriptionPlanName: string | null = null;
  if (isSeller && listing.seller_type === "contractor") {
    const contractor = await isContractor();
    if (contractor) {
      const sub = await getActiveContractorSubscription(supabase, user!.id);
      if (sub) {
        subscriptionSlots = subscriptionSlotsLeft(sub);
        subscriptionPlanName = sub.plan.name_fi;
      }
    }
  }

  const photos = await fetchListingPhotos(id);

  const deviceTypeLabel = formatDeviceTypeLabel(listing.pump_type_slug);

  const isWanted = listing.listing_kind === "wanted";
  const isDonate = listing.listing_kind === "donate";

  let donationCompletion: ListingDonationCompletion | null = null;
  let recipientLabel: string | null = null;

  if (isDonate) {
    const { data: completionRow } = await supabase
      .from("listing_donation_completions")
      .select("*")
      .eq("listing_id", id)
      .maybeSingle();

    if (completionRow) {
      donationCompletion = completionRow as ListingDonationCompletion;
    }

    if (listing.donation_recipient_id) {
      const admin = tryCreateAdminClient();
      if (admin) {
        const { data: recipientProfile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", listing.donation_recipient_id)
          .maybeSingle();
        recipientLabel = recipientProfile?.full_name ?? "Noutaja";
      }
    }
  }

  const isSelectedRecipient =
    Boolean(user && listing.donation_recipient_id === user.id);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainDetail}>
        <Link
          href="/markkinapaikka/ilmoitukset"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Ilmoitukset
        </Link>

        <p className="mt-4 text-xs font-medium uppercase text-stone-500">
          {isDonate ? "Lahjoitus · " : isWanted ? "Ostopyyntö · " : null}
          {listingCategoryLabel(
            listing.product_category ?? "device",
          )}{" "}
          · {listing.condition === "new" ? "Uusi" : "Käytetty"} ·{" "}
          {listing.seller_type === "customer" ? "Yksityinen myyjä" : "Yritys"}
          {isPublic &&
            expiresLabel &&
            ` · voimassa ${expiresLabel} asti (${LISTING_DURATION_WEEKS} vk)`}
          {isSeller && !isPublic && (
            <>
              {" "}
              ·{" "}
              {sellerListingStatusLabel({
                status,
                pending_publish: listing.pending_publish,
              })}
            </>
          )}
        </p>

        {virhe && isSeller && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {virhe}
          </p>
        )}

        {isSeller && pendingVerification && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
            Ilmoitus odottaa sähköpostivahvistusta osoitteessa{" "}
            <span className="font-medium">{listing.contact_email}</span>. Tarkista
            posti (myös roskaposti). Linkki vanhenee 24 tunnissa.
          </p>
        )}

        {isSeller && status === "expired" && (
          <section
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-5"
            aria-labelledby="renew-listing-heading"
          >
            <h2
              id="renew-listing-heading"
              className="font-semibold text-amber-950"
            >
              Ilmoitus on vanhentunut
            </h2>
            <p className="mt-2 text-sm text-amber-900">
              {LISTING_DURATION_WEEKS} viikon jälkeen ilmoitus poistuu torilta.
              Voit uusia saman ilmoituksen — kuvat ja tiedot säilyvät.
            </p>
            <div className="mt-4">
              <RenewListingForm
                listingId={id}
                sellerType={
                  listing.seller_type === "contractor" ? "contractor" : "customer"
                }
                subscriptionSlots={subscriptionSlots}
                subscriptionPlanName={subscriptionPlanName}
              />
            </div>
          </section>
        )}
        {isSeller && lasku === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Uusiminen odottaa maksua ({summa ?? "29 €"}). Lasku lähetetään
            sähköpostiisi osoitteesta {MARKETPLACE_INVOICE_EMAIL}.
          </p>
        )}
        {isSeller && status === "removed" && (
          <p className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-700" role="status">
            Olet poistanut tämän ilmoituksen. Se ei näy ostajille.
          </p>
        )}

        {isSeller && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/markkinapaikka/omat-ilmoitukset"
              className="text-sm font-medium text-sky-700 hover:underline"
            >
              Kaikki omat ilmoitukset
            </Link>
            {canRemove && (
              <RemoveListingButton listingId={id} title={listing.title} />
            )}
          </div>
        )}

        {uusittu === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Ilmoitus uusittu — se näkyy torilla {LISTING_DURATION_WEEKS} viikkoa.
          </p>
        )}
        {julkaistu === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Ilmoitus julkaistu onnistuneesti.
          </p>
        )}
        {saaja === "1" && isSeller && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
            Noutaja valittu. Sovi nouto viestillä ja merkitse tavara luovutetuksi, kun nouto on tehty.
          </p>
        )}
        {luovutettu === "1" && isSeller && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
            Merkitsit tavaran luovutetuksi. Saaja vahvistaa vielä noudon.
          </p>
        )}
        {kiitos === "1" && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
            Lahjoitus vahvistettu. Kiitos yhteisöllisyydestä!
          </p>
        )}
        {hylatty === "1" && (
          <p className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-700" role="status">
            Noutoa ei vahvistettu. Voit valita toisen noutajan viesteistä.
          </p>
        )}

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          {isPublic && (
            <ShareLinkPanel
              path={`/markkinapaikka/ilmoitukset/${id}`}
              title="Jaa ilmoitus"
              description="Kopioi linkki tai jaa se viestissä tai sähköpostissa."
              label="Jaa ilmoitus"
              compact
              className="w-full sm:max-w-md sm:p-3"
            />
          )}
        </div>
        <p className="mt-2 text-2xl font-bold text-sky-800">
          {isDonate
            ? "Ilmaiseksi"
            : isWanted
              ? listing.price_eur != null
                ? `Budjetti max ${listing.price_eur.toLocaleString("fi-FI")} €`
                : "Budjetti neuvoteltavissa"
              : listing.price_eur != null
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

        {(listing.manufacturer || listing.model || listing.year_manufactured || deviceTypeLabel) && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {deviceTypeLabel && (
              <div>
                <dt className="text-stone-500">Laitteen tyyppi</dt>
                <dd className="font-medium">{deviceTypeLabel}</dd>
              </div>
            )}
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

        {isPublic && !isSeller && isDonate && (
          <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
            <h2 className="font-semibold text-emerald-950">Haluatko tavaran?</h2>
            <p className="mt-2 text-sm text-emerald-900">
              Ota yhteyttä myyjään viestillä alla. Myyjä valitsee yhden noutajan,
              kun lahjoitus on valmis luovutettavaksi.
            </p>
          </section>
        )}

        {isPublic && !isSeller && isWanted && (
          <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
            <h2 className="font-semibold text-emerald-950">Myy vastaava laite?</h2>
            <p className="mt-2 text-sm text-emerald-900">
              Ota yhteyttä ostajaehdotukseen sähköpostilla, puhelimella tai chatilla
              alla.
            </p>
          </section>
        )}

        {isPublic && !isSeller && !isWanted && !isDonate && (
          <ListingInstallCta listing={listing} />
        )}

        {isPublic && !isSeller && (
          <section className="mt-8 rounded-xl border border-sky-200 bg-sky-50/60 p-6">
            <h2 className="font-semibold text-sky-950">
              {isWanted
                ? "Ota yhteyttä ostajaan"
                : isDonate
                  ? "Ota yhteyttä lahjoittajaan"
                  : "Ota yhteyttä myyjään"}
            </h2>
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

        {isSeller && user && isDonate && (
          <ListingDonationSellerPanel
            listingId={id}
            completion={donationCompletion}
            recipientLabel={recipientLabel}
          />
        )}

        {isSeller && user && (
          <ListingSellerInbox
            listingId={id}
            inquiries={sellerInbox}
            currentUserId={user.id}
            sellerLabel={sellerLabel}
            isDonation={isDonate}
            donationRecipientId={listing.donation_recipient_id}
          />
        )}

        {isSelectedRecipient &&
          donationCompletion?.status === "selected" &&
          !isSeller && (
            <ListingDonationSelectedNotice recipientLabel={null} />
          )}

        {isSelectedRecipient && donationCompletion && !isSeller && (
          <ListingDonationRecipientPanel completion={donationCompletion} />
        )}

        {isPublic && !isSeller && user && buyerChat !== null && (
          <ListingChat
            listingId={id}
            inquiryId={buyerChat.inquiry.id || null}
            messages={buyerChat.messages}
            currentUserId={user.id}
            buyerId={user.id}
            sellerLabel={sellerLabel}
          />
        )}

        {isPublic && !isSeller && !user && (
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
