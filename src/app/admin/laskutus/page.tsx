import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { MarketplaceBillingQueue } from "@/components/admin/marketplace-billing-queue";
import {
  PlatformBillingQueue,
  type PlatformBillingRow,
} from "@/components/admin/platform-billing-queue";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { getAdminBillingEmail } from "@/lib/billing-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { formatPriceFromCents } from "@/lib/marketplace-pricing";
import { brand } from "@/lib/brand-theme";

export default async function AdminBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/laskutus");

  await requireAdmin();

  const admin = createAdminClient();

  const { data: invoices } = await admin
    .from("platform_invoices")
    .select(
      `
      id,
      status,
      amount_cents,
      due_at,
      invoiced_at,
      invoice_reference,
      admin_notes,
      created_at,
      project_id,
      contractor_id,
      projects ( title ),
      contractor_profiles (
        company_name,
        business_id,
        billing_email,
        billing_address_line,
        billing_postal_code,
        billing_city
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const contractorIds = [
    ...new Set((invoices ?? []).map((i) => i.contractor_id as string)),
  ];
  const loginEmailByContractor = new Map<string, string>();
  await Promise.all(
    contractorIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.email) loginEmailByContractor.set(id, data.user.email);
    }),
  );

  const platformRows: PlatformBillingRow[] = (invoices ?? []).map((inv) => {
    const project = Array.isArray(inv.projects) ? inv.projects[0] : inv.projects;
    const cp = Array.isArray(inv.contractor_profiles)
      ? inv.contractor_profiles[0]
      : inv.contractor_profiles;
    const addr = [cp?.billing_address_line, cp?.billing_postal_code, cp?.billing_city]
      .filter(Boolean)
      .join(", ");

    return {
      id: inv.id,
      status: inv.status,
      amountCents: inv.amount_cents,
      dueAt: inv.due_at,
      invoicedAt: inv.invoiced_at,
      invoiceReference: inv.invoice_reference,
      adminNotes: inv.admin_notes,
      createdAt: inv.created_at,
      projectId: inv.project_id,
      projectTitle: project?.title ?? "Urakka",
      companyName: cp?.company_name ?? "—",
      businessId: cp?.business_id ?? null,
      billingEmail: cp?.billing_email ?? null,
      loginEmail: loginEmailByContractor.get(inv.contractor_id) ?? null,
      billingAddress: addr || null,
    };
  });

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
      marketplace_plans ( name_fi ),
      equipment_listings ( title )
    `,
    )
    .in("status", ["pending", "invoiced"])
    .order("created_at", { ascending: true });

  const marketplaceRows = (requests ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const plan = Array.isArray(r.marketplace_plans)
      ? r.marketplace_plans[0]
      : r.marketplace_plans;
    const listing = Array.isArray(r.equipment_listings)
      ? r.equipment_listings[0]
      : r.equipment_listings;
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
      listingTitle: listing?.title ?? null,
    };
  });

  const billingEmail = getAdminBillingEmail();

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Laskutus</h1>
        <AdminNav current="/admin/laskutus" />
        <p className="mt-2 text-sm text-stone-600">
          Manuaalinen laskutus kevytyrittäjäpalvelun kautta (ei Stripeä). Ilmoitukset
          lähetetään osoitteeseen <strong>{billingEmail}</strong>. Merkitse lasku
          lähetetyksi ja maksetuksi, kun maksu on kirjattu.
        </p>

        <section id="valitysmaksut" className="mt-10">
          <h2 className="text-lg font-semibold">Välitysmaksut (tarjouskilpailu)</h2>
          <p className="text-sm text-stone-500">
            Kun asiakas hyväksyy tarjouksen, laskuta urakoitsijalta välityspalkkio.
          </p>
          <PlatformBillingQueue rows={platformRows} />
        </section>

        <section id="tori" className="mt-12 border-t border-stone-200 pt-10">
          <h2 className="text-lg font-semibold">Tori (ilmoitukset ja tilaukset)</h2>
          <MarketplaceBillingQueue rows={marketplaceRows} />
        </section>
      </main>
    </div>
  );
}
