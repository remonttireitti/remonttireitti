import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlatformFeePanel } from "@/components/bid/platform-fee-panel";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { ProjectChat } from "@/components/messaging/project-chat";
import { SiteHeader } from "@/components/site-header";
import { ProjectOverviewCards } from "@/components/project/project-overview-cards";
import { fetchProjectPhotos } from "@/lib/project-photos";
import {
  bidHasSplitEquipmentOffer,
  bidResolvedAmountCents,
  formatBidAcceptScopeShort,
} from "@/lib/bid-accept-scope";
import { bidTotalAmountCents, bidWorkAmountCents } from "@/lib/bid-amounts";
import { formatEurosFromCents } from "@/lib/bids";
import { getSessionUser, isContractor } from "@/lib/auth";
import { fetchContractorProjectConversation } from "@/lib/messages-server";
import { createClient } from "@/lib/supabase/server";

export default async function ContractorWonProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ maksu?: string }>;
}) {
  const { id } = await params;
  const { maksu } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/tarjoukset/urakka/${id}`);

  if (!(await isContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      `
      id, title, description, details, municipality, postal_code,
      budget_min, budget_max, desired_start, status, contact_revealed_at,
      accepted_bid_id,
      service_categories ( name_fi )
    `,
    )
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: bid } = await supabase
    .from("bids")
    .select(
      "id, amount_cents, offers_equipment, equipment_amount_cents, equipment_description, accepted_includes_equipment, message, status, estimated_days, submitted_at",
    )
    .eq("project_id", id)
    .eq("contractor_id", user.id)
    .maybeSingle();

  const isProvisionalWinner =
    bid &&
    project.accepted_bid_id === bid.id &&
    project.status === "bid_accepted";
  const isAcceptedWinner = bid?.status === "accepted";

  if (!bid || (!isProvisionalWinner && !isAcceptedWinner)) notFound();

  const projectPhotos = await fetchProjectPhotos(supabase, id);

  const { data: invoice } = await supabase
    .from("platform_invoices")
    .select("id, status, amount_cents, due_at, paid_at")
    .eq("project_id", id)
    .eq("contractor_id", user.id)
    .maybeSingle();

  if (!invoice) notFound();

  let contact: {
    contact_email: string;
    contact_phone: string;
    address_line: string;
  } | null = null;

  if (invoice.status === "paid") {
    const { data: row } = await supabase
      .from("project_contacts")
      .select("contact_email, contact_phone, address_line")
      .eq("project_id", id)
      .single();
    contact = row;
  }

  const sc = project.service_categories as
    | { name_fi: string }
    | { name_fi: string }[]
    | null;
  const categoryName = Array.isArray(sc)
    ? (sc[0]?.name_fi ?? "Remontti")
    : (sc?.name_fi ?? "Remontti");

  const simulateEnabled = process.env.PLATFORM_FEE_SIMULATE === "true";

  const chatData = await fetchContractorProjectConversation(
    supabase,
    id,
    user.id,
    user.id,
  );

  const { data: contractorProfile } = await supabase
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/tarjoukset" className="text-sm text-sky-700 hover:underline">
          ← Pyynnöt
        </Link>

        {maksu === "ok" && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Maksu kirjattu. Yhteystiedot ovat alla.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-900">
            {invoice.status === "paid"
              ? "Tarjous hyväksytty"
              : "Viimeistele diili"}
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-bold">{project.title}</h1>
        <p className="text-stone-500">{categoryName}</p>

        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          {bidHasSplitEquipmentOffer(bid) &&
          bid.accepted_includes_equipment != null ? (
            <>
              <p className="text-sm font-medium text-stone-600">
                Asiakas hyväksyi:{" "}
                {formatBidAcceptScopeShort(bid.accepted_includes_equipment)}
              </p>
              <p className="mt-1 text-2xl font-bold text-sky-800">
                {formatEurosFromCents(bidResolvedAmountCents(bid))}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Asennus {formatEurosFromCents(bidWorkAmountCents(bid))}
                {bid.accepted_includes_equipment &&
                  bid.equipment_amount_cents != null && (
                    <>
                      {" "}
                      + laite {formatEurosFromCents(bid.equipment_amount_cents)}
                    </>
                  )}
              </p>
              {bid.equipment_description && bid.accepted_includes_equipment && (
                <p className="mt-1 text-sm text-stone-600">
                  {bid.equipment_description}
                </p>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-sky-800">
              {formatEurosFromCents(bidResolvedAmountCents(bid))}
            </p>
          )}
          {bidHasSplitEquipmentOffer(bid) &&
            bid.accepted_includes_equipment == null && (
              <p className="mt-1 text-sm text-stone-500">
                Tarjous: asennus {formatEurosFromCents(bidWorkAmountCents(bid))}{" "}
                tai yhteensä {formatEurosFromCents(bidTotalAmountCents(bid))}{" "}
                laitteen kanssa
              </p>
            )}
          <p className="mt-2 text-sm whitespace-pre-wrap text-stone-700">
            {bid.message}
          </p>
        </div>

        <div className="mt-6">
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
            showContact={!!contact}
            showLocationOnly={!contact}
            contactEmail={contact?.contact_email}
            contactPhone={contact?.contact_phone}
            addressLine={contact?.address_line}
          />
        </div>

        {invoice.status === "pending" && (
          <ValuePromoBanner variant="contractor-pay-on-win" className="mt-8" />
        )}

        <PlatformFeePanel
          invoice={invoice}
          contact={
            contact
              ? {
                  ...contact,
                  postal_code: project.postal_code,
                  municipality: project.municipality,
                }
              : null
          }
          simulateEnabled={simulateEnabled}
        />

        {chatData && (
          <ProjectChat
            conversationId={chatData.conversation.id}
            messages={chatData.messages}
            currentUserId={user.id}
            customerId={chatData.conversation.customer_id}
            customerLabel="Asiakas"
            contractorLabel={
              contractorProfile?.company_name ?? "Urakoitsija"
            }
            revalidatePaths={[`/tarjoukset/urakka/${id}`]}
            readOnly={project.status === "completed"}
            perspective="contractor"
          />
        )}
      </main>
    </div>
  );
}
