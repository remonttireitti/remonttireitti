import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerBids, type BidWithContractor } from "@/components/bid/customer-bids";
import { OrderFinalizationStatus } from "@/components/bid/order-finalization-status";
import { ProjectBiddingChats } from "@/components/messaging/project-bidding-chats";
import { ProjectChat } from "@/components/messaging/project-chat";
import { CancelProjectButton } from "@/components/project/cancel-project-button";
import { DeleteProjectButton } from "@/components/project/delete-project-button";
import { ProjectDraftPublishPanel } from "@/components/project/project-draft-publish-panel";
import { ProjectLifecyclePanel } from "@/components/project/project-lifecycle-panel";
import { ProjectOverviewCards } from "@/components/project/project-overview-cards";
import { fetchProjectPhotos } from "@/lib/project-photos";
import { ReviewDisplay } from "@/components/review/review-display";
import { ReviewForm } from "@/components/review/review-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { expirePendingAcceptanceForProject } from "@/lib/expire-pending-acceptance";
import { getProjectStatusLabel } from "@/lib/projects";
import { fetchCustomerProjectById } from "@/lib/projects-server";
import { ensureProjectConversation } from "@/app/actions/messages";
import {
  fetchContractorProjectConversation,
  fetchCustomerProjectConversations,
} from "@/lib/messages-server";
import { fetchContractorRatings } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    hyvaksytty?: string;
    virhe?: string;
    paivitetty?: string;
    peruttu?: string;
    luonnos?: string;
    julkaistu?: string;
  }>;
}) {
  const { id } = await params;
  const { hyvaksytty, virhe, paivitetty, peruttu, luonnos, julkaistu } =
    await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/remontti/${id}`);

  const supabase = await createClient();
  let project = await fetchCustomerProjectById(supabase, id, user.id);

  if (!project) notFound();

  const expireResult = await expirePendingAcceptanceForProject(id);
  const acceptanceExpired = expireResult === "expired";

  async function loadBidsAndInvoice() {
    const [invoiceRes, bidsRes] = await Promise.all([
      supabase
        .from("platform_invoices")
        .select(
          `
          status,
          amount_cents,
          due_at,
          paid_at,
          contractor_profiles ( company_name )
        `,
        )
        .eq("project_id", id)
        .maybeSingle(),
      supabase
        .from("bids")
        .select(
          `
          id,
          contractor_id,
          amount_cents,
          offers_equipment,
          equipment_amount_cents,
          equipment_description,
          accepted_includes_equipment,
          message,
          status,
          estimated_days,
          vat_included,
          scope_terms,
          contract_terms,
          warranty_work,
          warranty_equipment,
          earliest_start_date,
          confirms_licenses,
          confirms_building_standards,
          counter_amount_cents,
          counter_message,
          counter_offered_at,
          counter_status,
          submitted_at,
          confirmed_content_revision,
          rejection_message,
          rejected_at,
          contractor_profiles ( company_name )
        `,
        )
        .eq("project_id", id)
        .order("submitted_at", { ascending: true }),
    ]);
    return {
      platformInvoice: invoiceRes.data,
      bids: bidsRes.data,
    };
  }

  if (acceptanceExpired) {
    project = (await fetchCustomerProjectById(supabase, id, user.id)) ?? project;
  }

  const { platformInvoice, bids } = await loadBidsAndInvoice();

  const contractorIds = [
    ...new Set((bids ?? []).map((b) => b.contractor_id as string)),
  ];
  const contractorRatings = await fetchContractorRatings(
    supabase,
    contractorIds,
  );
  const projectPhotos = await fetchProjectPhotos(supabase, id);

  const { data: review } = await supabase
    .from("reviews")
    .select("rating, body, would_recommend, created_at")
    .eq("project_id", id)
    .maybeSingle();

  const acceptedBidId = project.accepted_bid_id ?? null;
  const acceptedBid =
    (bids ?? []).find((b) => b.status === "accepted") ??
    (acceptedBidId
      ? (bids ?? []).find((b) => b.id === acceptedBidId)
      : undefined);

  const invoiceContractorName = platformInvoice
    ? Array.isArray(platformInvoice.contractor_profiles)
      ? platformInvoice.contractor_profiles[0]?.company_name
      : (
          platformInvoice.contractor_profiles as {
            company_name: string;
          } | null
        )?.company_name
    : null;

  const acceptedCompany =
    invoiceContractorName ??
    (acceptedBid
      ? Array.isArray(acceptedBid.contractor_profiles)
        ? acceptedBid.contractor_profiles[0]?.company_name
        : (acceptedBid.contractor_profiles as { company_name: string } | null)
            ?.company_name
      : null);

  const sc = project.service_categories as
    | { name_fi: string }
    | { name_fi: string }[]
    | null;
  const categoryName = Array.isArray(sc)
    ? (sc[0]?.name_fi ?? "Remontti")
    : (sc?.name_fi ?? "Remontti");

  const status = project.status as ProjectStatus;
  const pendingFinalization =
    status === "bid_accepted" && platformInvoice?.status === "pending";
  const statusLabel = getProjectStatusLabel(status, {
    finalizing: pendingFinalization,
  });
  const ratingsMap = Object.fromEntries(contractorRatings);

  const canCancelProject = ["draft", "published", "receiving_bids"].includes(
    status,
  );
  const submittedBidCount = (bids ?? []).filter(
    (b) => b.status === "submitted",
  ).length;
  const biddingPhase = ["published", "receiving_bids"].includes(status);
  const chatEnabled = [
    "bid_accepted",
    "in_progress",
    "completed",
  ].includes(status);

  const biddingConversations = biddingPhase
    ? await fetchCustomerProjectConversations(supabase, id, user.id)
    : [];

  let chatData =
    chatEnabled && acceptedBid
      ? await fetchContractorProjectConversation(
          supabase,
          id,
          acceptedBid.contractor_id,
          user.id,
        )
      : null;

  if (chatEnabled && !chatData && acceptedBid) {
    await ensureProjectConversation(
      supabase,
      id,
      user.id,
      acceptedBid.contractor_id,
    );
    chatData = await fetchContractorProjectConversation(
      supabase,
      id,
      acceptedBid.contractor_id,
      user.id,
    );
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canCancelProject && (
              <>
                <Link
                  href={`/remontti/${id}/muokkaa`}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Muokkaa pyyntöä
                </Link>
                <CancelProjectButton
                  projectId={id}
                  title={project.title}
                  submittedBidCount={submittedBidCount}
                />
              </>
            )}
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
              {statusLabel}
            </span>
          </div>
        </div>

        <p className="mt-1 text-stone-500">{categoryName}</p>

        {luonnos === "1" && status === "draft" && (
          <p
            className="mt-4 rounded-lg border border-stone-200 bg-stone-100 p-3 text-sm text-stone-800"
            role="status"
          >
            Luonnos tallennettu. Urakoitsijat eivät näe pyyntöä ennen julkaisua.
          </p>
        )}
        {julkaistu === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Tarjouspyyntö julkaistu — urakoitsijat voivat nyt jättää tarjouksia.
          </p>
        )}
        {peruttu === "1" && (
          <p
            className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-800"
            role="status"
          >
            Tarjouspyyntö on peruttu. Saapuneet tarjoukset poistettiin. Voit poistaa
            pyynnön pysyvästi yllä olevalla painikkeella.
          </p>
        )}
        {hyvaksytty === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Tarjous valittu. Tilaus viimeistellään — saat ilmoituksen, kun urakoitsija
            on maksanut välityspalkkion ja yhteystiedot avautuvat.
          </p>
        )}
        {paivitetty === "1" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Tarjouspyyntö päivitetty.
            {biddingPhase &&
              (bids ?? []).some((b) => b.status === "submitted") &&
              " Urakoitsijat päivittävät tarjouksensa ennen hyväksyntää."}
          </p>
        )}
        {virhe === "vanhentunut-tarjous" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            Tarjousta ei voi hyväksyä: urakoitsija ei ole vielä päivittänyt tarjoustaan
            muutosten jälkeen.
          </p>
        )}
        {virhe === "vastatarjous-odottaa" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            Tarjousta ei voi hyväksyä, kun vastatarjous odottaa urakoitsijan vastausta.
          </p>
        )}
        {virhe === "valitse-laite" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            Valitse hyväksytkö vain asennuksen vai asennuksen ja laitteen.
          </p>
        )}
        {virhe === "lasku" && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            Tarjous hyväksyttiin, mutta välityslaskun luonti epäonnistui. Ota yhteyttä
            tukeen.
          </p>
        )}

        {status === "draft" && <ProjectDraftPublishPanel projectId={id} />}

        {acceptedCompany && (
          <OrderFinalizationStatus
            invoice={
              platformInvoice
                ? {
                    status: platformInvoice.status as
                      | "pending"
                      | "paid"
                      | "cancelled",
                    amount_cents: platformInvoice.amount_cents,
                    due_at: platformInvoice.due_at,
                    paid_at: platformInvoice.paid_at,
                  }
                : null
            }
            contractorName={acceptedCompany}
            projectId={id}
            expiredMessage={acceptanceExpired}
          />
        )}

        <div className="mt-8">
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
            contactEmail={project.contact_email}
            contactPhone={project.contact_phone}
            addressLine={project.address_line}
            postalCode={project.postal_code}
            municipality={project.municipality}
            budgetMin={project.budget_min}
            budgetMax={project.budget_max}
            desiredStart={project.desired_start}
            completionNotes={project.completion_notes ?? undefined}
            contactHiddenHint={
              platformInvoice && platformInvoice.status !== "paid"
                ? "Urakoitsija ei näe yhteystietoja ennen välitysmaksun maksamista."
                : undefined
            }
          />
        </div>

        <ProjectLifecyclePanel projectId={id} status={status} />

        <CustomerBids
          projectId={id}
          projectStatus={status}
          contentRevision={project.content_revision ?? 1}
          bids={(bids ?? []) as BidWithContractor[]}
          contractorRatings={ratingsMap}
          acceptedBidId={acceptedBidId}
        />

        {biddingPhase && (
          <ProjectBiddingChats
            conversations={biddingConversations}
            currentUserId={user.id}
            customerId={user.id}
            projectId={id}
          />
        )}

        {chatData && (
          <ProjectChat
            conversationId={chatData.conversation.id}
            messages={chatData.messages}
            currentUserId={user.id}
            customerId={chatData.conversation.customer_id}
            customerLabel="Asiakas"
            contractorLabel={acceptedCompany ?? "Urakoitsija"}
            revalidatePaths={[`/remontti/${id}`]}
            readOnly={status === "completed"}
          />
        )}

        {status === "completed" && !review && acceptedCompany && (
          <ReviewForm projectId={id} contractorName={acceptedCompany} />
        )}

        {review && (
          <ReviewDisplay
            rating={review.rating}
            body={review.body}
            wouldRecommend={review.would_recommend}
            createdAt={review.created_at}
          />
        )}
      </main>
    </div>
  );
}
