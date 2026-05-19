import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { MarketplaceBillingQueue } from "@/components/admin/marketplace-billing-queue";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { formatPriceFromCents } from "@/lib/marketplace-pricing";

export default async function AdminMarketplacePage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/markkinapaikka");

  await requireAdmin();

  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("marketplace_billing_requests")
    .select(
      `
      id,
      kind,
      status,
      amount_eur_cents,
      description_fi,
      invoice_reference,
      invoiced_at,
      paid_at,
      created_at,
      profiles ( full_name, role ),
      marketplace_plans ( name_fi )
    `,
    )
    .in("status", ["pending", "invoiced"])
    .order("created_at", { ascending: true });

  const rows = (requests ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const plan = Array.isArray(r.marketplace_plans)
      ? r.marketplace_plans[0]
      : r.marketplace_plans;
    return {
      id: r.id,
      kind: r.kind,
      status: r.status,
      amount: formatPriceFromCents(r.amount_eur_cents),
      description: r.description_fi,
      invoiceReference: r.invoice_reference,
      createdAt: r.created_at,
      sellerName: profile?.full_name ?? "—",
      sellerRole: profile?.role ?? "—",
      planName: plan?.name_fi,
    };
  });

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Markkinapaikka — laskutusjono</h1>
        <AdminNav current="/admin/markkinapaikka" />
        <p className="mt-2 text-sm text-stone-600">
          Merkitse lasku lähetetyksi ja maksetuksi. Kk-tilaus aktivoituu maksun
          jälkeen; yksittäinen ilmoitus julkaistaan, kun ilmoitus on linkitetty
          pyyntöön.
        </p>

        <MarketplaceBillingQueue rows={rows} />
      </main>
    </div>
  );
}
