import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ProjectWizard } from "@/components/project/project-wizard";
import { getProfile, getSessionUser } from "@/lib/auth";
import { buildProjectEditSnapshot } from "@/lib/project-edit";
import { fetchHeatPumpCatalog } from "@/lib/job-catalog-server";
import { createClient } from "@/lib/supabase/server";
import { brand } from "@/lib/brand-theme";

const EDITABLE_STATUSES = ["draft", "published", "receiving_bids"] as const;

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/remontti/${id}/muokkaa`);

  const profile = await getProfile();
  if (profile?.role === "contractor") {
    redirect("/oma-tili");
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      `
      id,
      job_type_id,
      category_id,
      title,
      description,
      municipality,
      postal_code,
      address_line,
      contact_email,
      contact_phone,
      budget_min,
      budget_max,
      desired_start,
      flexibility_weeks,
      details,
      status
    `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!project) notFound();

  if (
    !EDITABLE_STATUSES.includes(
      project.status as (typeof EDITABLE_STATUSES)[number],
    )
  ) {
    redirect(`/remontti/${id}`);
  }

  const { data: tradeRows } = await supabase
    .from("project_trades")
    .select("trade_id")
    .eq("project_id", id);

  const tradeIds = (tradeRows ?? []).map((r) => r.trade_id as string);

  const { count: submittedBidCount } = await supabase
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .eq("status", "submitted");

  const catalog = await fetchHeatPumpCatalog();
  const editSnapshot = buildProjectEditSnapshot(project, tradeIds);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link
          href={`/remontti/${id}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Takaisin pyyntöön
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Muokkaa tarjouspyyntöä
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Päivitä kohdetiedot. Jos tarjouksia on jo saapunut, urakoitsijat saavat
          ilmoituksen ja heidän täytyy vahvistaa tarjouksensa uudelleen.
        </p>
        <div className="mt-8">
          <ProjectWizard
            catalog={catalog}
            editSnapshot={editSnapshot}
            submittedBidCount={submittedBidCount ?? 0}
          />
        </div>
      </main>
    </div>
  );
}
