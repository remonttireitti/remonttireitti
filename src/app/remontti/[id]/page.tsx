import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BidEvaluationPromo } from "@/components/bid-evaluation/bid-evaluation-promo";
import { CustomerBids, type BidWithContractor } from "@/components/bid/customer-bids";
import { OrderFinalizationStatus } from "@/components/bid/order-finalization-status";
import { ProjectBiddingChats } from "@/components/messaging/project-bidding-chats";
import { ProjectChat } from "@/components/messaging/project-chat";
import { CancelProjectButton } from "@/components/project/cancel-project-button";
import { DeleteProjectButton } from "@/components/project/delete-project-button";
import { ProjectDraftPublishPanel } from "@/components/project/project-draft-publish-panel";
import { CompletedHuoltokirjaLink } from "@/components/project/completed-huoltokirja-link";
import { ProjectLifecyclePanel } from "@/components/project/project-lifecycle-panel";
import { ProjectOverviewCards } from "@/components/project/project-overview-cards";
import { fetchProjectPhotos } from "@/lib/project-photos";
import { ReviewDisplay } from "@/components/review/review-display";
import { ReviewForm } from "@/components/review/review-form";
import { PlatformFeedbackPanel } from "@/components/feedback/platform-feedback-panel";
import { SiteHeader } from "@/components/site-header";
import { GuestClaimBanner } from "@/components/project/guest-claim-banner";
import { GuestMessagingNotice } from "@/components/project/guest-messaging-notice";
import { GuestProjectHeader } from "@/components/project/guest-project-header";
import { getProfile, getSessionUser } from "@/lib/auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { resolveProjectPageAccess } from "@/lib/resolve-project-page-access";
import { expirePendingAcceptanceForProject } from "@/lib/expire-pending-acceptance";
import { expireStaleProjectIfNeeded } from "@/lib/expire-stale-projects";
import { ProjectInactivityBanner } from "@/components/project/project-inactivity-banner";
import { getProjectStatusLabel } from "@/lib/projects";
import { fetchCustomerProjectById } from "@/lib/projects-server";
import { ensureProjectConversation } from "@/app/actions/messages";
import {
  fetchContractorProjectConversation,
  fetchCustomerProjectConversations,
} from "@/lib/messages-server";
import { fetchContractorRatings } from "@/lib/reviews";
import { fetchAvailableCustomerReferralCredit } from "@/lib/customer-referral";
import { fetchPlatformFeedbackForProject } from "@/lib/platform-feedback-server";
import { CustomerCompletionRequestBanner } from "@/components/project/customer-completion-request-banner";
import { LearnedCriteriaWarnings } from "@/components/project/learned-criteria-warnings";
import { ProjectQualityScorePanel } from "@/components/project/project-quality-score-panel";
import { fetchLearnedCriteria } from "@/lib/template-criterion-stats";
import { fetchOpenCompletionRequestsForProject } from "@/lib/project-completion-requests-server";
import { countProjectViews } from "@/lib/project-views-server";
import { fetchCustomerProjectActivity } from "@/lib/project-activity-server";
import { countActiveEvaluatorsForCategory } from "@/lib/bid-evaluation-availability-server";
import { evaluationCategoryForJobSlug } from "@/lib/bid-evaluation";
import { ProjectActivityTimeline } from "@/components/project/project-activity-timeline";
import { brand } from "@/lib/brand-theme";
import { scoreProjectFromRow } from "@/lib/project-request-quality";
import { fetchProjectTradeNamesById } from "@/lib/project-trades-server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

export const dynamic = "force-dynamic";

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
    auto_suljettu?: string;
    taydenna?: string;
    taydennetty?: string;
    token?: string;
    vahvistettu?: string;
    from?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const {
    hyvaksytty,
    virhe,
    paivitetty,
    peruttu,
    luonnos,
    julkaistu,
    auto_suljettu,
    taydenna,
    taydennetty,
    token,
    vahvistettu,
    from,
  } = sp;

  if (token && from !== "auth") {
    const qs = new URLSearchParams();
    qs.set("project", id);
    qs.set("token", token);
    if (julkaistu) qs.set("julkaistu", julkaistu);
    if (vahvistettu) qs.set("vahvistettu", vahvistettu);
    redirect(`/auth/guest-access?${qs}`);
  }

  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const supabase = await createClient();

  const access = await resolveProjectPageAccess(supabase, id, {
    userId: user?.id,
    urlToken: token,
  });

  if (!access) {
    redirect(`/kirjaudu?redirect=/remontti/${id}`);
  }

  let { project, isGuestAccess, guestEmail } = access;

  const guestAdmin = isGuestAccess ? tryCreateAdminClient() : null;
  if (isGuestAccess && !guestAdmin) {
    redirect(`/kirjaudu?redirect=/remontti/${id}`);
  }
  const dataClient = guestAdmin ?? supabase;

  const expireResult = await expirePendingAcceptanceForProject(id);
  const acceptanceExpired = expireResult === "expired";

  const staleResult = await expireStaleProjectIfNeeded(id);
  if (staleResult === "closed") {
    redirect(`/remontti/${id}?auto_suljettu=1`);
  }

  if (staleResult === "warned" && user && !isGuestAccess) {
    project = (await fetchCustomerProjectById(supabase, id, user.id)) ?? project;
  }

  async function loadBidsAndInvoice() {
    const [invoiceRes, bidsRes] = await Promise.all([
      dataClient
        .from("platform_invoices")
        .select(
          `
          status,
          amount_cents,
          due_at,
          paid_at,
          contractor_profiles (
            company_name,
            founded_year,
            company_size_band,
            refrigerant_license,
            electrical_qualification,
            lvi_qualifications
          )
        `,
        )
        .eq("project_id", id)
        .maybeSingle(),
      dataClient
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
          offer_scope,
          offered_trade_ids,
          turnkey_coordination,
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
          contractor_profiles (
            company_name,
            founded_year,
            company_size_band,
            refrigerant_license,
            electrical_qualification,
            lvi_qualifications
          )
        `,
        )
        .eq("project_id", id)
        .eq("is_admin_preview", false)
        .order("submitted_at", { ascending: true }),
    ]);
    return {
      platformInvoice: invoiceRes.data,
      bids: bidsRes.data,
    };
  }

  if (acceptanceExpired && user && !isGuestAccess) {
    project = (await fetchCustomerProjectById(supabase, id, user.id)) ?? project;
  }

  const [{ platformInvoice, bids }, projectTradeNamesById] = await Promise.all([
    loadBidsAndInvoice(),
    fetchProjectTradeNamesById(dataClient, id),
  ]);
  const projectTradeNamesRecord = Object.fromEntries(projectTradeNamesById);

  let customerReferralDiscountCents = 0;
  if (user && !isGuestAccess) {
    const referralAdmin = tryCreateAdminClient();
    if (referralAdmin) {
      const credit = await fetchAvailableCustomerReferralCredit(
        referralAdmin,
        user.id,
      );
      if (credit) customerReferralDiscountCents = credit.amount_cents;
    }
  }

  const contractorIds = [
    ...new Set((bids ?? []).map((b) => b.contractor_id as string)),
  ];
  const contractorRatings = await fetchContractorRatings(
    dataClient,
    contractorIds,
  );
  const projectPhotos = await fetchProjectPhotos(dataClient, id);

  const { data: jobTypeRow } = await dataClient
    .from("projects")
    .select("job_types ( slug )")
    .eq("id", id)
    .maybeSingle();

  const jobSlugRaw = jobTypeRow?.job_types as
    | { slug: string }
    | { slug: string }[]
    | null;
  const jobSlug = Array.isArray(jobSlugRaw)
    ? (jobSlugRaw[0]?.slug ?? null)
    : (jobSlugRaw?.slug ?? null);

  const projectQuality = scoreProjectFromRow({
    jobSlug,
    title: project.title,
    description: project.description,
    budgetMax: project.budget_max,
    budgetMin: project.budget_min,
    desiredStart: project.desired_start,
    details: project.details,
    photoCount: projectPhotos.length,
  });

  const openCompletionRequests = ["published", "receiving_bids", "draft"].includes(
    project.status,
  )
    ? await fetchOpenCompletionRequestsForProject(dataClient, id)
    : [];

  const contractorViewCount =
    taydennetty === "1"
      ? await countProjectViews(dataClient, id)
      : 0;

  const activityEvents = await fetchCustomerProjectActivity(id, dataClient);
  const evaluationCategory = evaluationCategoryForJobSlug(jobSlug);
  const evaluatorCount = await countActiveEvaluatorsForCategory(evaluationCategory);

  if (openCompletionRequests.length > 0) {
    const contractorIds = [...new Set(openCompletionRequests.map((r) => r.contractor_id))];
    const { data: companies } = await dataClient
      .from("contractor_profiles")
      .select("id, company_name")
      .in("id", contractorIds);
    const companyById = new Map(
      (companies ?? []).map((c) => [c.id as string, c.company_name as string]),
    );
    for (const req of openCompletionRequests) {
      req.contractorCompany = companyById.get(req.contractor_id) ?? null;
    }
  }

  const { data: review } = await dataClient
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

  const learnedCriteria =
    status === "draft"
      ? (await fetchLearnedCriteria(dataClient, jobSlug)).map((r) => ({
          ...r,
          jobSlug: jobSlug ?? "generic",
        }))
      : [];

  const platformFeedback =
    status === "completed" && user
      ? await fetchPlatformFeedbackForProject(supabase, user.id, id)
      : null;
  const pendingFinalization =
    status === "bid_accepted" && platformInvoice?.status === "pending";
  const statusLabel = getProjectStatusLabel(status, {
    finalizing: pendingFinalization,
  });
  const ratingsMap = Object.fromEntries(contractorRatings);

  const canCancelProject =
    !isGuestAccess &&
    Boolean(user) &&
    ["draft", "published", "receiving_bids"].includes(status);
  const submittedBidCount = (bids ?? []).filter(
    (b) => b.status === "submitted",
  ).length;
  const biddingPhase = ["published", "receiving_bids"].includes(status);
  const chatEnabled = [
    "bid_accepted",
    "in_progress",
    "completed",
  ].includes(status);

  const biddingConversations =
    biddingPhase && user
      ? await fetchCustomerProjectConversations(supabase, id, user.id)
      : [];

  let chatData =
    chatEnabled && acceptedBid && user
      ? await fetchContractorProjectConversation(
          supabase,
          id,
          acceptedBid.contractor_id,
          user.id,
        )
      : null;

  if (chatEnabled && !chatData && acceptedBid && user) {
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

  const loggedInRoleLabel =
    isGuestAccess && profile?.role === "admin"
      ? "admin"
      : isGuestAccess && profile?.role === "contractor"
        ? "urakoitsija"
        : isGuestAccess && profile?.role === "customer"
          ? "asiakas"
          : isGuestAccess && user
            ? "käyttäjä"
            : null;

  return (
    <div className={brand.page}>
      {isGuestAccess ? (
        <GuestProjectHeader
          guestEmail={guestEmail}
          loggedInRole={loggedInRoleLabel}
        />
      ) : (
        <SiteHeader />
      )}
      <main className={brand.mainDetail}>
        <Link
          href={isGuestAccess ? "/" : "/oma-tili"}
          className="text-sm text-sky-700 hover:underline"
        >
          {isGuestAccess ? "← Etusivu" : "← Oma tili"}
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
        {vahvistettu === "1" && (
          <p
            className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950"
            role="status"
          >
            Sähköposti vahvistettu. Henkilökohtainen linkki toimii tästä eteenpäin
            tässä selaimessa.
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
        {auto_suljettu === "1" && status === "cancelled" && (
          <p
            className="mt-4 rounded-lg border border-stone-200 bg-stone-100 p-3 text-sm text-stone-800"
            role="status"
          >
            Tarjouspyyntö suljettiin automaattisesti, koska sitä ei päivitetty tai
            suljettu ajoissa. Saapuneet tarjoukset poistettiin käytöstä. Voit poistaa
            pyynnön pysyvästi yllä olevalla painikkeella.
          </p>
        )}
        {biddingPhase && (
          <ProjectInactivityBanner projectId={id} project={project} />
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

        {openCompletionRequests.length > 0 && (
          <CustomerCompletionRequestBanner
            projectId={id}
            requests={openCompletionRequests}
            jobSlug={jobSlug}
          />
        )}

        {taydennetty === "1" && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
            role="status"
          >
            <span className="font-semibold">Tarjouspyyntö päivitetty.</span>
            {contractorViewCount > 0 && (
              <>
                {" "}
                {contractorViewCount}{" "}
                {contractorViewCount === 1 ? "yritys on" : "yritystä on"} jo tutustunut
                pyyntöön. Uudet tiedot on toimitettu niille automaattisesti.
              </>
            )}
          </p>
        )}

        {taydenna === "1" && openCompletionRequests.length === 0 && biddingPhase && (
          <p className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
            Täydennä tarjouspyyntöä alla olevasta linkistä — urakoitsijat saavat tarkempia
            tietoja tarjousta varten.
          </p>
        )}

        {(status === "draft" || biddingPhase) && projectQuality.score < 90 && (
          <div className="mt-6">
            <ProjectQualityScorePanel
              quality={projectQuality}
              compact={biddingPhase && status !== "draft"}
            />
            {status === "draft" && learnedCriteria.length > 0 && (
              <LearnedCriteriaWarnings
                learned={learnedCriteria}
                quality={projectQuality}
                jobSlug={jobSlug}
              />
            )}
          </div>
        )}

        {status === "draft" && <ProjectDraftPublishPanel projectId={id} />}

        {acceptedCompany && (
          <>
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
            {["bid_accepted", "in_progress", "completed"].includes(status) && (
              <p className="mt-4">
                <Link
                  href={`/remontti/${id}/sopimus`}
                  className="text-sm font-medium text-sky-800 hover:underline"
                >
                  Tulosta sopimusyhteenveto (PDF)
                </Link>
              </p>
            )}
          </>
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
            bidDeadline={project.bid_deadline}
            bidDeadlineVariant="customer"
            contactHiddenHint={
              platformInvoice && platformInvoice.status !== "paid"
                ? "Urakoitsija ei näe yhteystietoja ennen välitysmaksun maksamista."
                : undefined
            }
          />
        </div>

        <div className="mt-8">
          <ProjectActivityTimeline events={activityEvents} />
        </div>

        {isGuestAccess && guestEmail && (
          <GuestClaimBanner guestEmail={guestEmail} projectId={id} />
        )}

        {!isGuestAccess && <ProjectLifecyclePanel projectId={id} status={status} />}

        <div id="tarjoukset">
          <CustomerBids
            projectId={id}
            projectStatus={status}
            contentRevision={project.content_revision ?? 1}
            bids={(bids ?? []) as BidWithContractor[]}
            contractorRatings={ratingsMap}
            acceptedBidId={acceptedBidId}
            jobSlug={jobSlug}
            projectTradeNamesById={projectTradeNamesRecord}
            customerReferralDiscountCents={customerReferralDiscountCents}
          />
          {submittedBidCount > 0 && biddingPhase && evaluatorCount > 0 && (
            <BidEvaluationPromo
              projectId={id}
              category={evaluationCategory}
              jobSlug={jobSlug}
            />
          )}
        </div>

        {biddingPhase && isGuestAccess && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Kysymykset urakoitsijoilta</h2>
            <div className="mt-3">
              <GuestMessagingNotice guestEmail={guestEmail} projectId={id} />
            </div>
          </div>
        )}

        {biddingPhase && user && !isGuestAccess && (
          <ProjectBiddingChats
            conversations={biddingConversations}
            currentUserId={user.id}
            customerId={user.id}
            projectId={id}
          />
        )}

        {chatData && user && (
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

        {status === "completed" && user && (
          <CompletedHuoltokirjaLink projectId={id} userId={user.id} />
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

        {status === "completed" && (
          <PlatformFeedbackPanel
            defaultRole="customer"
            projectId={id}
            existing={platformFeedback}
          />
        )}
      </main>
    </div>
  );
}
