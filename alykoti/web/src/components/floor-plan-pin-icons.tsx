import type { FloorPlanPinIcon } from "@/lib/floor-plan-pins";

type Props = { icon: FloorPlanPinIcon; className?: string };

export function FloorPlanPinIconView({ icon, className = "h-5 w-5" }: Props) {
  const cn = className;
  switch (icon) {
    case "bulb":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="currentColor" aria-hidden>
          <path d="M12 2a7 7 0 0 0-4 12.74V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.26A7 7 0 0 0 12 2Z" />
          <path d="M9 19h6M10 22h4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "switch":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="8" width="18" height="8" rx="4" />
          <circle cx="9" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "plug":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M9 2v6M15 2v6M7 8h10v6a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V8Z" strokeLinecap="round" />
        </svg>
      );
    case "fan":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="currentColor" aria-hidden>
          <path d="M12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 1 1 8 0v3" strokeLinecap="round" />
        </svg>
      );
    case "door":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M7 4h10v16H7z" />
          <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "motion":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3c4 3 6 6 6 9s-2 6-6 9c-4-3-6-6-6-9s2-6 6-9Z" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "fire":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="currentColor" aria-hidden>
          <path d="M12 3c1 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1.5-3.5 3-5.5 1 1.5 1 2.5 1 3.5Z" />
        </svg>
      );
    case "leak":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="currentColor" aria-hidden>
          <path d="M12 3c3 5 7 7 7 11a7 7 0 1 1-14 0c0-4 4-6 7-11Z" />
        </svg>
      );
    case "thermometer":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" strokeLinecap="round" />
        </svg>
      );
    case "ventilation":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 12h16M12 4v16" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "sensor":
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
        </svg>
      );
    case "label":
    default:
      return (
        <svg viewBox="0 0 24 24" className={cn} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 7h16v10H4z" strokeLinejoin="round" />
          <path d="M8 11h8" strokeLinecap="round" />
        </svg>
      );
  }
}
