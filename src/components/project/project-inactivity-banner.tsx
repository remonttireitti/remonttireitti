import Link from "next/link";
import {
  daysUntilAutoClose,
  formatAutoCloseDateFi,
  shouldShowInactivityWarning,
} from "@/lib/project-inactivity";

export function ProjectInactivityBanner({
  projectId,
  project,
}: {
  projectId: string;
  project: {
    status: string;
    bid_deadline: string | null;
    published_at: string | null;
    inactivity_warning_sent_at?: string | null;
  };
}) {
  if (!shouldShowInactivityWarning(project)) return null;

  const closeLabel = formatAutoCloseDateFi(project);
  const daysLeft = daysUntilAutoClose(project);

  return (
    <div
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      <p className="font-semibold">Tarjouspyyntö suljetaan automaattisesti</p>
      <p className="mt-1 leading-relaxed">
        {daysLeft !== null && daysLeft <= 1
          ? "Pyyntö suljetaan huomenna"
          : daysLeft !== null
            ? `Pyyntö suljetaan noin ${daysLeft} päivän kuluttua`
            : "Pyyntö suljetaan pian"}
        {closeLabel ? ` (${closeLabel})` : ""}, jos et päivitä sitä, valitse
        tarjousta tai peru pyyntöä. Suljettaessa saapuneet tarjoukset poistetaan
        käytöstä.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={`/remontti/${projectId}/muokkaa`}
          className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Päivitä pyyntöä
        </Link>
        <Link
          href={`/remontti/${projectId}#tarjoukset`}
          className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100/60"
        >
          Katso tarjoukset
        </Link>
      </div>
    </div>
  );
}
