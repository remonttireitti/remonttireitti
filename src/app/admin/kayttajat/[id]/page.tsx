import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { EvaluatorAvailabilityAdminForm } from "@/components/admin/evaluator-availability-admin-form";
import { EvaluatorScopeForm } from "@/components/admin/evaluator-scope-form";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import {
  formatElectricalQualification,
  formatLviQualifications,
  formatRefrigerant,
} from "@/lib/format-qualifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import {
  getProfileRoleLabel,
  profileRoleBadgeClass,
} from "@/lib/profile-role-labels";
import { brand } from "@/lib/brand-theme";
import { ALL_EVALUATOR_SCOPE_SLUGS } from "@/lib/evaluator-scopes";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin");

  await requireAdmin();

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: contractor }, { data: evaluatorScopes }, { data: evaluatorProfile }] =
    await Promise.all([
      admin
        .from("contractor_profiles")
        .select(
          "company_name, refrigerant_license, electrical_qualification, lvi_qualifications",
        )
        .eq("id", id)
        .maybeSingle(),
      admin.from("evaluator_scopes").select("scope").eq("evaluator_id", id),
      admin
        .from("evaluator_profiles")
        .select("accepting_reviews, unavailable_note, unavailable_set_by")
        .eq("evaluator_id", id)
        .maybeSingle(),
    ]);

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const email =
    authList?.users.find((u) => u.id === id)?.email ?? "—";

  const scopesFromDb = (evaluatorScopes ?? []).map((r) => r.scope as string);
  const scopes =
    scopesFromDb.length > 0
      ? scopesFromDb
      : profile.role === "admin"
        ? [...ALL_EVALUATOR_SCOPE_SLUGS]
        : [];

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Käyttäjät
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{email}</h1>
            {profile.full_name && (
              <p className="mt-1 text-stone-600">{profile.full_name}</p>
            )}
            <p className="mt-1 font-mono text-xs text-stone-500">{profile.id}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${profileRoleBadgeClass(profile.role)}`}
          >
            {getProfileRoleLabel(profile.role)}
          </span>
        </header>

        <AdminNav current="/admin" />

        {contractor?.company_name && profile.role === "contractor" && (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Urakoitsijaprofiili
            </h2>
            <p className="mt-2 font-medium text-stone-900">
              {contractor.company_name}
            </p>
            {(contractor.refrigerant_license ||
              contractor.electrical_qualification ||
              contractor.lvi_qualifications?.length) && (
              <dl className="mt-3 space-y-1 text-sm text-stone-600">
                {contractor.refrigerant_license && (
                  <div>
                    <dt className="inline font-medium">Kylmäaine:</dt>{" "}
                    <dd className="inline">
                      {formatRefrigerant(contractor.refrigerant_license)}
                    </dd>
                  </div>
                )}
                {contractor.electrical_qualification && (
                  <div>
                    <dt className="inline font-medium">Sähkö:</dt>{" "}
                    <dd className="inline">
                      {formatElectricalQualification(
                        contractor.electrical_qualification,
                      )}
                    </dd>
                  </div>
                )}
                {contractor.lvi_qualifications?.length ? (
                  <div>
                    <dt className="inline font-medium">LVI:</dt>{" "}
                    <dd className="inline">
                      {formatLviQualifications(contractor.lvi_qualifications)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}
          </section>
        )}

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Käyttäjän hallinta
          </h2>
          <UserRowActions
            userId={profile.id}
            email={email}
            currentRole={profile.role}
            companyName={contractor?.company_name ?? null}
          />
        </section>

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Arvioijan laajuus
          </h2>
          <EvaluatorScopeForm userId={profile.id} scopes={scopes} />
        </section>

        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Arvioijan saatavuus
          </h2>
          <EvaluatorAvailabilityAdminForm
            userId={profile.id}
            hasScopes={scopes.length > 0 || profile.role === "admin"}
            profile={
              evaluatorProfile
                ? {
                    evaluator_id: profile.id,
                    accepting_reviews: evaluatorProfile.accepting_reviews as boolean,
                    unavailable_note:
                      (evaluatorProfile.unavailable_note as string | null) ?? null,
                    unavailable_set_by:
                      (evaluatorProfile.unavailable_set_by as
                        | "self"
                        | "admin"
                        | null) ?? null,
                  }
                : null
            }
          />
        </section>
      </main>
    </div>
  );
}
