import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketplaceOrderForm } from "@/components/marketplace/order-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import {
  CONTRACTOR_PLANS,
  LISTING_SINGLE,
  MARKETPLACE_INVOICE_EMAIL,
} from "@/lib/marketplace-pricing";
import type { MarketplacePlanSlug } from "@/lib/marketplace-pricing";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { brand } from "@/lib/brand-theme";

const ALL_SLUGS = new Set<MarketplacePlanSlug>([
  "contractor_basic",
  "contractor_pro",
  "listing_single",
]);

export default async function MarketplaceOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ paketti?: string }>;
}) {
  const { paketti } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/markkinapaikka/tilaa`);

  const contractor = await isContractor();
  if (!contractor) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const slug = (
    paketti && ALL_SLUGS.has(paketti as MarketplacePlanSlug)
      ? paketti
      : "contractor_basic"
  ) as MarketplacePlanSlug;

  const plan =
    CONTRACTOR_PLANS.find((p) => p.slug === slug) ??
    (slug === "listing_single" ? LISTING_SINGLE : CONTRACTOR_PLANS[0]);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href="/markkinapaikka/hinnasto"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Hinnasto
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Tilaa {marketplaceBrand.nameShort.toLowerCase()}</h1>
        <p className="mt-2 text-sm text-stone-600">
          Valittu paketti: <strong>{plan.name}</strong> ({plan.priceLabel}
          {plan.period ?? ""})
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Lähetämme laskun sähköpostiisi ({MARKETPLACE_INVOICE_EMAIL}). Et maksa
          kortilla sovelluksessa.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {CONTRACTOR_PLANS.map((p) => (
            <Link
              key={p.slug}
              href={`/markkinapaikka/tilaa?paketti=${p.slug}`}
              className={`rounded-full px-3 py-1 ${
                p.slug === slug
                  ? "bg-sky-700 text-white"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
            >
              {p.name}
            </Link>
          ))}
          <Link
            href={`/markkinapaikka/tilaa?paketti=listing_single`}
            className={`rounded-full px-3 py-1 ${
              slug === "listing_single"
                ? "bg-sky-700 text-white"
                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
            }`}
          >
            Yksittäinen
          </Link>
        </div>

        <MarketplaceOrderForm planSlug={slug} />
      </main>
    </div>
  );
}
