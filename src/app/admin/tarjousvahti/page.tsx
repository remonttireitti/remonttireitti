import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { BidEvaluationSettingsForm } from "@/components/admin/bid-evaluation-settings-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchBidEvaluationSettings } from "@/lib/bid-evaluation-server";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { brand } from "@/lib/brand-theme";
import {
  formatEvaluationCategoryLabel,
  BID_EVALUATION_STATUS_LABELS,
} from "@/lib/bid-evaluation";

export default async function AdminTarjousvahtiPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/tarjousvahti");
  await requireAdmin();

  const admin = createAdminClient();
  const settings = await fetchBidEvaluationSettings(admin);

  const { data: requests } = await admin
    .from("bid_evaluation_requests")
    .select("id, category, status, submitted_at, quoted_total_cents")
    .neq("status", "draft")
    .order("submitted_at", { ascending: false })
    .limit(20);

  const { data: unavailable } = await admin
    .from("evaluator_profiles")
    .select("evaluator_id, unavailable_note, unavailable_set_by, profiles ( full_name )")
    .eq("accepting_reviews", false);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Admin
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Tarjousvahti</h1>
        <p className="mt-2 text-sm text-stone-600">
          Hinnoittelu ja jonotilanne. Aloita ilmaisena — ota maksullinen tila käyttöön vain
          jos arviointi ulkoistetaan.
        </p>
        <AdminNav current="/admin/tarjousvahti" />

        <div className="mt-8 space-y-8">
          <BidEvaluationSettingsForm settings={settings} />

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Poissa olevat arvioijat</h2>
            {(unavailable ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">Kaikki arvioijat ottavat pyyntöjä vastaan.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(unavailable ?? []).map((row) => {
                  const rawProfile = row.profiles as
                    | { full_name: string | null }
                    | { full_name: string | null }[]
                    | null;
                  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
                  return (
                    <li key={row.evaluator_id as string} className="rounded-lg bg-stone-50 px-3 py-2">
                      <span className="font-medium">
                        {profile?.full_name ?? row.evaluator_id}
                      </span>
                      {" — "}
                      {row.unavailable_note as string}
                      <span className="text-stone-500">
                        {" "}
                        ({row.unavailable_set_by === "admin" ? "admin" : "itse"})
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Viimeisimmät pyynnöt</h2>
            {(requests ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">Ei vielä pyyntöjä.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100 text-sm">
                {(requests ?? []).map((r) => (
                  <li key={r.id as string} className="flex justify-between gap-2 py-2">
                    <span>
                      {formatEvaluationCategoryLabel(r.category as string)}
                      {" · "}
                      {BID_EVALUATION_STATUS_LABELS[r.status as keyof typeof BID_EVALUATION_STATUS_LABELS]}
                    </span>
                    <span className="text-stone-500">
                      {r.quoted_total_cents != null && r.quoted_total_cents > 0
                        ? `${Math.round((r.quoted_total_cents as number) / 100)} €`
                        : "0 €"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
