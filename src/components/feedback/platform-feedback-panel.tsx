import { PlatformFeedbackForm } from "@/components/feedback/platform-feedback-form";
import type { PlatformFeedbackRow } from "@/lib/platform-feedback-server";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PlatformFeedbackPanel({
  role,
  projectId,
  existing,
  compact = false,
}: {
  role: "customer" | "contractor";
  projectId?: string;
  existing: PlatformFeedbackRow | null;
  compact?: boolean;
}) {
  if (existing) {
    return (
      <section
        className={
          compact
            ? "rounded-2xl border border-sky-200 bg-sky-50/50 p-5"
            : "mt-8 rounded-2xl border border-sky-200 bg-sky-50/50 p-6"
        }
      >
        <h2 className="text-lg font-semibold text-sky-950">
          Kiitos palautteesta!
        </h2>
        <p className="mt-1 text-sm text-sky-900/80">
          Palaute tallennettu {formatWhen(existing.created_at)}.
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
      </section>
    );
  }

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-sky-200 bg-sky-50/50 p-5"
          : "mt-8 rounded-2xl border border-sky-200 bg-sky-50/50 p-6"
      }
    >
      <h2 className="text-lg font-semibold text-sky-950">
        {projectId ? "Palaute palvelusta" : "Palautekysely"}
      </h2>
      <p className="mt-1 text-sm text-sky-900/80">
        {projectId
          ? "Miten Remonttivalitys-palvelu toimi tämän urakan aikana?"
          : "Kerro kokemuksestasi — autat meitä kehittämään palvelua."}
      </p>
      <PlatformFeedbackForm role={role} projectId={projectId} compact={compact} />
    </section>
  );
}
