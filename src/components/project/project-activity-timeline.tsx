import {
  formatActivityWhen,
  type ProjectActivityEvent,
} from "@/lib/project-activity";
import { brand } from "@/lib/brand-theme";

const kindStyles = {
  customer: "bg-sky-50 text-sky-900 ring-sky-100",
  contractor: "bg-orange-50 text-orange-950 ring-orange-100",
  system: "bg-stone-100 text-stone-800 ring-stone-200",
} as const;

export function ProjectActivityTimeline({
  events,
  title = "Tapahtumaloki",
  emptyMessage = "Ei vielä tapahtumia.",
}: {
  events: ProjectActivityEvent[];
  title?: string;
  emptyMessage?: string;
}) {
  if (!events.length) {
    return (
      <section className={`${brand.section} p-5 sm:p-6`}>
        <h2 className={brand.sectionTitle}>{title}</h2>
        <p className="mt-3 text-sm text-stone-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className={`${brand.section} p-5 sm:p-6`}>
      <h2 className={brand.sectionTitle}>{title}</h2>
      <ol className="mt-4 space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0"
          >
            <time
              dateTime={event.at}
              className="w-[8.5rem] shrink-0 pt-0.5 text-xs tabular-nums text-stone-500"
            >
              {formatActivityWhen(event.at)}
            </time>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-900">{event.label}</p>
              {event.detail && (
                <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
                  {event.detail}
                </p>
              )}
            </div>
            <span
              className={`hidden shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:inline ${kindStyles[event.kind]}`}
            >
              {event.kind === "customer"
                ? "Asiakas"
                : event.kind === "contractor"
                  ? "Urakoitsija"
                  : "Järjestelmä"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
