import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ilmoita myytävä — remonttitori",
  description: `Julkaise myynti-ilmoitus ${marketplaceBrand.nameShort.toLowerCase()}lle ilman tiliä — remonttiin liittyvät laitteet, varaosat ja tarvikkeet. Yksityisille ilmaiseksi sähköpostivahvistuksella.`,
  path: "/markkinapaikka/ilmoita",
});
import { ContractorActivationBanner } from "@/components/account/contractor-activation-banner";
import { ContractorListingForm } from "@/components/marketplace/contractor-listing-form";
import { ContractorListingPaywall } from "@/components/marketplace/contractor-listing-paywall";
import { ConsumerListingForm } from "@/components/marketplace/consumer-listing-form";
import { ConsumerDonationListingForm } from "@/components/marketplace/consumer-donation-listing-form";
import { ConsumerWantedListingForm } from "@/components/marketplace/consumer-wanted-listing-form";
import { ContractorDonationListingForm } from "@/components/marketplace/contractor-donation-listing-form";
import { SiteHeader } from "@/components/site-header";
import {
  defaultCompanyFromUser,
  shouldOfferContractorActivation,
} from "@/lib/contractor-activation";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { countConsumerListingSlotsLeft } from "@/app/actions/marketplace-listings";
import { countDonationListingSlotsLeft } from "@/app/actions/listing-donations";
import { normalizeListingContactEmail } from "@/lib/listing-contact-email";
import {
  getActiveContractorSubscription,
  subscriptionSlotsLeft,
} from "@/lib/marketplace-subscription";
import { CONSUMER_FREE_MAX_ACTIVE_LISTINGS } from "@/lib/marketplace-pricing";
import { createClient } from "@/lib/supabase/server";

export default async function MarketplaceCreateListingPage({
  searchParams,
}: {
  searchParams: Promise<{
    tyyppi?: string;
    tapa?: string;
    lasku?: string;
    summa?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const { tyyppi, tapa } = params;

  if (tyyppi === "ostopyynto") {
    const user = await getSessionUser();
    if (user && (await isContractor())) {
      redirect("/markkinapaikka/ilmoita");
    }
    return <ConsumerWantedListingInfo />;
  }

  if (tyyppi === "lahjoitus") {
    const user = await getSessionUser();
    if (user && (await isContractor())) {
      return <ContractorDonationListingInfo />;
    }
    return <ConsumerDonationListingInfo />;
  }

  if (tyyppi === "kuluttaja") {
    const user = await getSessionUser();
    if (user && (await isContractor())) {
      redirect("/markkinapaikka/ilmoita");
    }
    return <ConsumerListingInfo />;
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/markkinapaikka/ilmoita?tyyppi=kuluttaja");
  }

  const profile = await getProfile();
  const contractor = await isContractor();

  if (shouldOfferContractorActivation(user, profile)) {
    return (
      <div className={brand.page}>
        <SiteHeader />
        <main className={brand.mainForm}>
          <Link
            href="/markkinapaikka"
            className="text-sm text-sky-700 hover:underline"
          >
            ← {marketplaceBrand.nameShort}
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Ilmoita myytävä</h1>
          <div className="mt-6">
            <ContractorActivationBanner
              defaultCompany={defaultCompanyFromUser(user)}
              compact
            />
          </div>
        </main>
      </div>
    );
  }

  if (!contractor) {
    redirect("/markkinapaikka/ilmoita?tyyppi=kuluttaja");
  }

  const supabase = await createClient();
  const sub = await getActiveContractorSubscription(supabase, user.id);
  const slots = sub ? subscriptionSlotsLeft(sub) : 0;
  const canUseSubscription = Boolean(sub && slots > 0);
  const singleListingMode = tapa === "yksittainen";
  const showListingForm = canUseSubscription || singleListingMode;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Ilmoita myytävä</h1>
        <p className="mt-2 text-sm text-stone-600">
          Yritysilmoitus: kk-tilaus tai yksittäinen maksu. Voit myydä remonttiin
          liittyviä laitteita, varaosia, tarvikkeita ja työkaluja. Ilmoitus
          julkaistaan heti, jos sinulla on aktiivinen tilaus ja paikkoja jäljellä.
        </p>

        {params.lasku === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Ilmoitus odottaa maksua ({params.summa ?? "29 €"}). Lasku lähetetään
            sähköpostiisi osoitteesta{" "}
            {params.email ?? "laskutus@remonttireitti.fi"}.
          </p>
        )}

        {showListingForm ? (
          <>
            {singleListingMode && !canUseSubscription && (
              <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                Täytät yksittäistä maksullista ilmoitusta. Ilmoitus julkaistaan
                laskun maksamisen jälkeen.
              </p>
            )}

            <ContractorListingForm
              subscriptionSlots={slots}
              subscriptionPlanName={sub?.plan.name_fi ?? null}
              singleOnly={singleListingMode && !canUseSubscription}
              defaults={{
                contact_email: user.email ?? "",
                contact_phone: profile?.phone ?? "",
              }}
            />
          </>
        ) : (
          <ContractorListingPaywall
            reason={sub && slots <= 0 ? "quota_full" : "no_subscription"}
            singleListingHref="/markkinapaikka/ilmoita?tapa=yksittainen"
          />
        )}

      </main>
    </div>
  );
}

async function ConsumerWantedListingInfo() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const isGuest = !user;
  const contactEmail = user
    ? normalizeListingContactEmail(user.email ?? "")
    : "";
  const slotsLeft = user
    ? await countConsumerListingSlotsLeft(user.id, contactEmail)
    : CONSUMER_FREE_MAX_ACTIVE_LISTINGS;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Haluan ostaa</h1>
        <p className="mt-2 text-sm text-stone-600">
          {isGuest
            ? "Julkaise ostopyyntö ilman tiliä. Lähetämme vahvistuslinkin sähköpostiisi — ilmoitus näkyy torilla vasta vahvistuksen jälkeen."
            : "Julkaise ostopyyntö torilla — myyjät näkevät mitä etsit. Ilmainen yksityishenkilölle."}
        </p>
        {isGuest && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Ilman tiliä:</span> hallitse ilmoitusta
            sähköpostiin tulevalla linkillä. Kirjautuneena näet ilmoitukset myös
            kohdassa Omat ilmoitukset.
          </p>
        )}

        <ConsumerWantedListingForm
          slotsLeft={slotsLeft}
          defaults={{
            contact_email: user?.email ?? "",
            contact_phone: profile?.phone ?? "",
          }}
        />

        <p className="mt-8 text-center text-sm text-stone-500">
          Myyt laitetta?{" "}
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className="text-sky-700 hover:underline"
          >
            Julkaise myynti-ilmoitus
          </Link>
        </p>
      </main>
    </div>
  );
}

async function ConsumerDonationListingInfo() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const isGuest = !user;
  const contactEmail = user
    ? normalizeListingContactEmail(user.email ?? "")
    : "";
  const slotsLeft = user
    ? await countDonationListingSlotsLeft(user.id, contactEmail)
    : await countDonationListingSlotsLeft(null, "");

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Annetaan ilmaiseksi</h1>
        <p className="mt-2 text-sm text-stone-600">
          {isGuest
            ? "Julkaise lahjoitusilmoitus ilman tiliä. Lähetämme vahvistuslinkin sähköpostiisi."
            : "Lahjoita ylijäämätavara remonttiyhteisölle — ilmainen yksityishenkilölle."}{" "}
          Enintään 2 aktiivista lahjoitusilmoitusta.
        </p>
        {isGuest && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Ilman tiliä:</span> hallitse ilmoitusta
            sähköpostiin tulevalla linkillä.
          </p>
        )}

        <ConsumerDonationListingForm
          slotsLeft={isGuest ? 2 : slotsLeft}
          isGuest={isGuest}
          defaults={{
            contact_email: user?.email ?? "",
            contact_phone: profile?.phone ?? "",
          }}
        />

        <p className="mt-8 text-center text-sm text-stone-500">
          Tarvitset apua työhön, ei tavaraa?{" "}
          <Link href="/apu" className="text-sky-700 hover:underline">
            Pieni apu
          </Link>{" "}
          on erillinen palvelu naapuriavulle.
        </p>
      </main>
    </div>
  );
}

async function ContractorDonationListingInfo() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/markkinapaikka/ilmoita?tyyppi=lahjoitus");

  const profile = await getProfile();
  const contactEmail = normalizeListingContactEmail(user.email ?? "");
  const slotsLeft = await countDonationListingSlotsLeft(user.id, contactEmail);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Yrityksen lahjoitus</h1>
        <p className="mt-2 text-sm text-stone-600">
          Lahjoita ylijäämävarastoa ilmaiseksi — ei tilaus- eikä ilmoitusmaksua.
          Julkaistaan heti. Enintään 2 aktiivista lahjoitusilmoitusta.
        </p>

        <ContractorDonationListingForm
          slotsLeft={slotsLeft}
          defaults={{
            contact_email: user.email ?? "",
            contact_phone: profile?.phone ?? "",
          }}
        />

        <p className="mt-8 text-center text-sm text-stone-500">
          Myyt tavaraa?{" "}
          <Link href="/markkinapaikka/ilmoita" className="text-sky-700 hover:underline">
            Yrityksen myynti-ilmoitus
          </Link>
        </p>
      </main>
    </div>
  );
}

async function ConsumerListingInfo() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const isGuest = !user;
  const contactEmail = user
    ? normalizeListingContactEmail(user.email ?? "")
    : "";
  const slotsLeft = user
    ? await countConsumerListingSlotsLeft(user.id, contactEmail)
    : CONSUMER_FREE_MAX_ACTIVE_LISTINGS;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">
          {isGuest ? "Ilmoita myytävä — ilman tiliä" : "Ilmoita myytävä laite"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {isGuest
            ? "Täytä ilmoitus ilman rekisteröitymistä. Lähetämme vahvistuslinkin sähköpostiisi — ilmoitus julkaistaan vasta linkin avaamisen jälkeen. Linkki on voimassa 24 tuntia."
            : "Yksityishenkilönä ilmoitus on maksuton. Vahvistamme sähköpostiosoitteen ennen julkaisua."}{" "}
          Enintään {CONSUMER_FREE_MAX_ACTIVE_LISTINGS} aktiivista ilmoitusta per
          sähköpostiosoite.
        </p>

        {isGuest ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Ilman tiliä:</span> hallitse ja poista
            ilmoitus sähköpostiin tulevalla linkillä.{" "}
            <Link href="/kirjaudu" className="font-medium text-sky-800 hover:underline">
              Kirjaudu
            </Link>
            , jos haluat nähdä kaikki ilmoituksesi yhdessä paikassa.
          </p>
        ) : (
          <p className="mt-3 text-sm">
            <Link
              href="/markkinapaikka/omat-ilmoitukset"
              className="font-medium text-sky-700 hover:underline"
            >
              Omat ilmoitukset
            </Link>
          </p>
        )}

        <ConsumerListingForm
          slotsLeft={slotsLeft}
          isGuest={isGuest}
          defaults={{
            contact_email: user?.email ?? "",
            contact_phone: profile?.phone ?? "",
          }}
        />

        <p className="mt-8 text-center text-sm text-stone-500">
          Oletko urakoitsija?{" "}
          <Link
            href="/markkinapaikka/ilmoita"
            className="text-sky-700 hover:underline"
          >
            Yrityksen ilmoitus
          </Link>
        </p>
      </main>
    </div>
  );
}
