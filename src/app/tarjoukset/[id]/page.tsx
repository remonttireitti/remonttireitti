import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import { ContractorBidPanel } from "@/components/bid/contractor-bid-panel";
import { isBidStale } from "@/lib/bid-staleness";
import { getProjectBudgetInfo } from "@/lib/project-budget";
import {
  getProjectEquipmentSupply,
  projectAllowsOptionalEquipmentOffer,
} from "@/lib/project-equipment-supply";
import { getSessionUser, isContractor } from "@/lib/auth";
import { ProjectChat } from "@/components/messaging/project-chat";
import { ProjectOverviewCards } from "@/components/project/project-overview-cards";
import { ensureProjectConversation } from "@/app/actions/messages";
import { fetchContractorProjectConversation } from "@/lib/messages-server";
import { fetchProjectPhotos } from "@/lib/project-photos";
import { fetchContractorBidDefaults } from "@/lib/contractor-bid-defaults-server";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";
import { createClient } from "@/lib/supabase/server";

export default async function ContractorProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tarjous?: string }>;
}) {
  const { id } = await params;
  const { tarjous } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/tarjoukset/${id}`);

  if (!(await isContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      `
      id, title, description, details, municipality, postal_code,
      budget_min, budget_max, desired_start, flexibility_weeks,
      status, bid_deadline, customer_id,
      job_types ( slug ),
      service_categories ( name_fi )
    `,
    )
    .eq("id", id)
    .in("status", ["published", "receiving_bids"])
    .single();

  if (!project) notFound();

  const projectPhotos = await fetchProjectPhotos(supabase, id);

  const { data: existingBid } = await supabase
    .from("bids")
    .select(
      "id, amount_cents, offers_equipment, equipment_amount_cents, equipment_description, message, status, estimated_days, vat_included, submitted_at, scope_terms, contract_terms, warranty_work, warranty_equipment, earliest_start_date, confirms_licenses, confirms_building_standards, counter_amount_cents, counter_message, counter_offered_at, counter_status, confirmed_content_revision, rejection_message, rejected_at",
    )
    .eq("project_id", id)
    .eq("contractor_id", user.id)
    .maybeSingle();

  const sc = project.service_categories as
    | { name_fi: string }
    | { name_fi: string }[]
    | null;
  const categoryName = Array.isArray(sc)
    ? (sc[0]?.name_fi ?? "Remontti")
    : (sc?.name_fi ?? "Remontti");

  const projectDetails = project.details as Parameters<
    typeof getProjectEquipmentSupply
  >[0];
  const requiresDeviceAndInstallation =
    getProjectEquipmentSupply(projectDetails) === "device_and_installation";
  const allowOptionalEquipmentOffer =
    projectAllowsOptionalEquipmentOffer(projectDetails);
  const budgetInfo = getProjectBudgetInfo(project);
  const contentRevision =
    (project as { content_revision?: number }).content_revision ?? 1;
  const bidStale =
    existingBid?.status === "submitted" &&
    isBidStale(existingBid, contentRevision);

  await ensureProjectConversation(
    supabase,
    id,
    project.customer_id,
    user.id,
  );

  const defaultBidTerms = await fetchContractorBidDefaults(user.id);
  const jobTypeSlug = resolveProjectJobTypeSlug({
    job_types: project.job_types as
      | { slug: string }
      | { slug: string }[]
      | null,
    details: project.details as Record<string, unknown> | null,
  });

  const chatData = await fetchContractorProjectConversation(
    supabase,
    id,
    user.id,
    user.id,
  );

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/tarjoukset" className="text-sm text-sky-700 hover:underline">
          ← Pyynnöt
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{project.title}</h1>
        <p className="text-stone-500">{categoryName}</p>

        {tarjous === "lahetetty" && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
          >
            <span className="font-semibold">Tarjous lähetetty.</span> Asiakas näkee sen
            tarjousvertailussa. Voit muokata tarjousta alla, kunnes asiakas hyväksyy
            jonkin tarjouksen.
          </p>
        )}
        {tarjous === "paivitetty" && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
          >
            <span className="font-semibold">Tarjous päivitetty.</span> Muutokset ovat
            nyt näkyvissä asiakkaalle.
          </p>
        )}

        <div>
          <ProjectOverviewCards
            description={project.description}
            details={
              project.details as {
                ilmalampopumppu?: unknown;
                ilmavesilampopumppu?: unknown;
                maalampopumppu?: unknown;
              } | null
            }
            photos={projectPhotos}
            postalCode={project.postal_code}
            municipality={project.municipality}
            budgetMin={project.budget_min}
            budgetMax={project.budget_max}
            desiredStart={project.desired_start}
            showContact={false}
            showLocationOnly
            bidDeadline={project.bid_deadline}
          />
        </div>

        {chatData && (
          <ProjectChat
            conversationId={chatData.conversation.id}
            messages={chatData.messages}
            currentUserId={user.id}
            customerId={chatData.conversation.customer_id}
            customerLabel="Asiakas"
            contractorLabel="Sinä"
            revalidatePaths={[`/tarjoukset/${id}`]}
            perspective="contractor"
            contactRestricted
          />
        )}

        <ValuePromoBanner variant="contractor-pay-on-win" className="mt-8" />

        <ContractorBidPanel
          projectId={id}
          bid={existingBid}
          requiresDeviceAndInstallation={requiresDeviceAndInstallation}
          allowOptionalEquipmentOffer={allowOptionalEquipmentOffer}
          budgetInfo={budgetInfo}
          bidStale={bidStale}
          defaultBidTerms={defaultBidTerms}
          jobTypeSlug={jobTypeSlug}
        />
      </main>
    </div>
  );
}
