import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGridCard, adminGridClassName } from "@/components/admin/admin-grid-card";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { getProfileRoleLabel } from "@/lib/profile-role-labels";
import { brand } from "@/lib/brand-theme";

const previewHints: Record<string, string> = {
  "valitse-asiakas-esikatselu":
    "Valitse yläreunan valikosta Selaa asiakkaana ennen tarjouspyynnön testausta.",
  "valitse-urakoitsija-esikatselu":
    "Valitse yläreunan valikosta Selaa urakoitsijana ennen tarjousten testausta.",
  "admin-ei-yritys":
    "Admin-tili ei käytä yrityksen hinnastoa tai pätevyyksien muokkausta. Käytä esikatselutilaa tai hallinnoi urakoitsijoita täältä.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ viesti?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin");

  await requireAdmin();

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, created_at")
    .order("created_at", { ascending: false });

  const { data: contractors } = await admin
    .from("contractor_profiles")
    .select("id, company_name");

  const contractorByUser = new Map((contractors ?? []).map((c) => [c.id, c]));

  const { data: authList } = await admin.auth.admin.listUsers({
    perPage: 200,
  });

  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const rows = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "—",
    companyName: contractorByUser.get(p.id)?.company_name ?? null,
  }));

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Admin — käyttäjähallinta</h1>
        {params.viesti && previewHints[params.viesti] && (
          <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            {previewHints[params.viesti]}
          </p>
        )}
        <p className="mt-3 max-w-2xl text-sm text-stone-600">
          Klikkaa käyttäjää avataksesi roolin, arvioijan laajuuden ja muut
          asetukset. Admin ei käytä yrityksen hinnastoa tai pätevyyksien
          muokkausta — testaa urakoitsijaa yläreunan esikatselutilalla.
        </p>
        <AdminNav current="/admin" />

        <p className="mt-6 text-sm text-stone-500">
          {rows.length} käyttäjää
        </p>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Ei käyttäjiä.
          </p>
        ) : (
          <div className={`mt-4 ${adminGridClassName}`}>
            {rows.map((row) => (
              <AdminGridCard
                key={row.id}
                id={row.id}
                href={`/admin/kayttajat/${row.id}`}
                title={row.companyName ?? row.full_name ?? row.email}
                footer={
                  <>
                    <span className="font-medium">Rooli:</span>{" "}
                    {getProfileRoleLabel(row.role)}
                  </>
                }
              >
                <p>{row.email}</p>
                {row.companyName && row.full_name && (
                  <p>{row.full_name}</p>
                )}
                {row.companyName ? (
                  <p>
                    <span className="text-white/75">Yritys:</span>{" "}
                    {row.companyName}
                  </p>
                ) : (
                  <p className="text-white/75">Ei yritysprofiilia</p>
                )}
              </AdminGridCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
