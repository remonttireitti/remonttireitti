import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformSubscriptionOrderForm } from "@/components/pricing/platform-subscription-order-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import {
  PLATFORM_INVOICE_EMAIL,
  PLATFORM_SUBSCRIPTION_PLANS,
  formatSubscriptionPrice,
  type PlatformSubscriptionSlug,
} from "@/lib/platform-pricing";

const VALID_SLUGS = new Set<PlatformSubscriptionSlug>(
  PLATFORM_SUBSCRIPTION_PLANS.map((p) => p.slug),
);

export default async function PlatformSubscriptionOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ jakso?: string }>;
}) {
  const { jakso } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/urakoitsijaksi/tilaa`);

  const contractor = await isContractor();
  if (!contractor) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const periodSlug = (
    jakso && VALID_SLUGS.has(jakso as PlatformSubscriptionSlug)
      ? jakso
      : "platform_12m"
  ) as PlatformSubscriptionSlug;

  const plan =
    PLATFORM_SUBSCRIPTION_PLANS.find((p) => p.slug === periodSlug) ??
    PLATFORM_SUBSCRIPTION_PLANS[PLATFORM_SUBSCRIPTION_PLANS.length - 1];

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link href="/urakoitsijaksi#valityspalkkio" className="text-sm text-sky-700 hover:underline">
          ← Hinnoittelu
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Tilaa kuukausitilaus</h1>
        <p className="mt-2 text-sm text-stone-600">
          Valittu jakso: <strong>{plan.name}</strong> ({formatSubscriptionPrice(plan)}{" "}
          veroton + ALV)
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Lasku lähetetään osoitteeseen {PLATFORM_INVOICE_EMAIL}. Et maksa kortilla
          sovelluksessa.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {PLATFORM_SUBSCRIPTION_PLANS.map((p) => (
            <Link
              key={p.slug}
              href={`/urakoitsijaksi/tilaa?jakso=${p.slug}`}
              className={`rounded-full px-3 py-1 ${
                p.slug === periodSlug
                  ? "bg-sky-700 text-white"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        <PlatformSubscriptionOrderForm periodSlug={periodSlug} />
      </main>
    </div>
  );
}
