import { PlatformFeedbackForm } from "@/components/feedback/platform-feedback-form";
import { PlatformFeedbackSupportForm } from "@/components/feedback/platform-feedback-support-form";
import type { PlatformFeedbackRow } from "@/lib/platform-feedback-server";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isFeedbackComplete(row: PlatformFeedbackRow): boolean {
  return Boolean(row.user_id || row.email_verified_at);
}

export function PlatformFeedbackPanel({
  defaultRole,
  projectId,
  existing,
  compact = false,
  requireGuestEmail = false,
  userEmail,
}: {
  defaultRole?: "customer" | "contractor";
  projectId?: string;
  existing: PlatformFeedbackRow | null;
  compact?: boolean;
  requireGuestEmail?: boolean;
  userEmail?: string | null;
}) {
  if (existing) {
    const complete = isFeedbackComplete(existing);
    const roleLabel = existing.role === "customer" ? "asiakkaana" : "urakoitsijana";

    return (
      <section
        className={
          compact
            ? "rounded-2xl border border-sky-200 bg-sky-50/50 p-5"
            : "rounded-2xl border border-sky-200 bg-sky-50/50 p-6"
        }
      >
        {complete ? (
          <>
            <h2 className="text-lg font-semibold text-sky-950">
              Kiitos palautteesta!
            </h2>
            <p className="mt-1 text-sm text-sky-900/80">
              Palaute tallennettu {formatWhen(existing.created_at)} ({roleLabel}).
            </p>
            <dl className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Selkeys</dt>
                <dd className="font-medium text-stone-900">
                  {"★".repeat(existing.clarity_rating)} ({existing.clarity_rating}/5)
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Käyttökokemus</dt>
                <dd className="font-medium text-stone-900">
                  {"★".repeat(existing.experience_rating)} ({existing.experience_rating}/5)
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-stone-500">Suosittelu</dt>
                <dd className="font-medium text-stone-900">
                  {existing.would_recommend ? "Kyllä" : "En"}
                </dd>
              </div>
              {existing.suggestions && (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">Kommentti</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-stone-800">
                    {existing.suggestions}
                  </dd>
                </div>
              )}
            </dl>

            {!projectId && (
              <div className="mt-6 border-t border-sky-200/80 pt-5">
                <h3 className="text-sm font-semibold text-stone-900">
                  Tarvitsetko apua?
                </h3>
                <p className="mt-1 text-sm text-stone-600">
                  Yleispalaute on jo annettu tälle tilille tai sähköpostille. Voit
                  lähettää tukipyynnön tai kysymyksen ylläpidolle.
                </p>
                <PlatformFeedbackSupportForm
                  feedbackId={existing.id}
                  guestEmail={existing.guest_email && !existing.user_id ? existing.guest_email : undefined}
                  compact={compact}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-amber-950">
              Vahvista palautteesi sähköpostilla
            </h2>
            <p className="mt-1 text-sm text-amber-900/90">
              Lähetimme vahvistuslinkin osoitteeseen {existing.guest_email}. Palaute
              lasketaan tilastoihin vasta linkin avaamisen jälkeen.
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-sky-200 bg-sky-50/50 p-5"
          : "rounded-2xl border border-sky-200 bg-sky-50/50 p-6"
      }
    >
      <h2 className="text-lg font-semibold text-sky-950">
        {projectId ? "Palaute palvelusta" : "Palautekysely"}
      </h2>
      <p className="mt-1 text-sm text-sky-900/80">
        {projectId
          ? "Miten Remonttireitti-palvelu toimi tämän urakan aikana?"
          : "Kerro kokemuksestasi — autat meitä kehittämään palvelua. Yksi yleispalaute per sähköposti."}
      </p>
      <PlatformFeedbackForm
        defaultRole={defaultRole}
        projectId={projectId}
        compact={compact}
        requireGuestEmail={requireGuestEmail}
        userEmail={userEmail}
      />
    </section>
  );
}
