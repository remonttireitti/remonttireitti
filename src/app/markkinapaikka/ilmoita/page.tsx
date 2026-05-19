import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ilmoita myytävä laite",
  description: `Julkaise ilmainen ilmoitus yksityishenkilönä tai yrityksen ilmoitus ${marketplaceBrand.nameShort.toLowerCase()}lle.`,
  path: "/markkinapaikka/ilmoita",
});
import { ContractorActivationBanner } from "@/components/account/contractor-activation-banner";
import { ContractorListingForm } from "@/components/marketplace/contractor-listing-form";
import { ConsumerListingForm } from "@/components/marketplace/consumer-listing-form";
import { SiteHeader } from "@/components/site-header";
import {
  defaultCompanyFromUser,
  shouldOfferContractorActivation,
} from "@/lib/contractor-activation";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { countActiveConsumerListings } from "@/app/actions/marketplace-listings";
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
    lasku?: string;
    summa?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const { tyyppi } = params;

  if (tyyppi === "kuluttaja") {
    return <ConsumerListingInfo />;
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/kirjaudu?redirect=/markkinapaikka/ilmoita");
  }

  const profile = await getProfile();
  const contractor = await isContractor();

  if (shouldOfferContractorActivation(user, profile)) {
    return (
      <div className="min-h-full bg-stone-50 text-stone-900">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-12">
          <Link
            href="/markkinapaikka"
            className="text-sm text-sky-700 hover:underline"
          >
            ← {marketplaceBrand.nameShort}
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Ilmoita myytävä laite</h1>
          <div className="mt-6">
            <ContractorActivationBanner
              defaultCompany={defaultCompanyFromUser(user)}
              compact
            />
          </div>
          <p className="mt-6 text-center text-sm text-stone-500">
            Myytkö yksityishenkilönä?{" "}
            <Link
              href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
              className="text-sky-700 hover:underline"
            >
              Ilmoita ilmaiseksi
            </Link>
          </p>
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

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-12">
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Ilmoita myytävä laite</h1>
        <p className="mt-2 text-sm text-stone-600">
          Yritysilmoitus: kk-tilaus tai yksittäinen maksu. Ilmoitus julkaistaan
          heti, jos sinulla on aktiivinen tilaus ja paikkoja jäljellä.
        </p>

        {params.lasku === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Ilmoitus odottaa maksua ({params.summa ?? "29 €"}). Lasku lähetetään
            osoitteeseen {params.email ?? "laskutus@remonttireitti.fi"}.
          </p>
        )}

        {!sub && params.lasku !== "1" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Ei aktiivista kk-tilausta. Voit julkaista yksittäisellä ilmoituksella
            tai{" "}
            <Link href="/markkinapaikka/tilaa" className="font-medium underline">
              tilata paketin
            </Link>
            .
          </p>
        )}

        <ContractorListingForm
          subscriptionSlots={slots}
          subscriptionPlanName={sub?.plan.name_fi ?? null}
          defaults={{
            contact_email: user.email ?? "",
            contact_phone: profile?.phone ?? "",
          }}
        />

        <p className="mt-8 text-center text-sm text-stone-500">
          Yksityishenkilönä?{" "}
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className="text-sky-700 hover:underline"
          >
            Ilmoita ilmaiseksi
          </Link>
        </p>
      </main>
    </div>
  );
}

async function ConsumerListingInfo() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/markkinapaikka/ilmoita?tyyppi=kuluttaja");

  const profile = await getProfile();
  const active = await countActiveConsumerListings(user.id);
  const slotsLeft = Math.max(0, CONSUMER_FREE_MAX_ACTIVE_LISTINGS - active);

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-12">
        <Link
          href="/markkinapaikka"
          className="text-sm text-sky-700 hover:underline"
        >
          ← {marketplaceBrand.nameShort}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Ilmoita myytävä laite</h1>
        <p className="mt-2 text-sm text-stone-600">
          Yksityishenkilönä ilmoitus on maksuton. Näkyy torilla 4 viikkoa tai kunnes
          poistat sen.
        </p>

        <p className="mt-3 text-sm">
          <Link
            href="/markkinapaikka/omat-ilmoitukset"
            className="font-medium text-sky-700 hover:underline"
          >
            Omat ilmoitukset
          </Link>
        </p>

        <ConsumerListingForm
          slotsLeft={slotsLeft}
          defaults={{
            contact_email: user.email ?? "",
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
