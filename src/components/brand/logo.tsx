import Link from "next/link";
import { NavLinkPendingContent } from "@/components/navigation/nav-link-pending";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-grad" x1="4" y1="4" x2="36" y2="36">
          <stop stopColor="#0284c7" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="route-grad" x1="8" y1="28" x2="32" y2="12">
          <stop stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-grad)" />
      <path
        d="M10 19.5 20 11l10 8.5V29H10v-9.5Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M14 26.5c3-4 9-4 12 0"
        stroke="url(#route-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="24" r="2" fill="#ea580c" />
    </svg>
  );
}

export function Logo({
  href = "/",
  showText = true,
  compactOnMobile = false,
  size = "md",
}: {
  href?: string;
  showText?: boolean;
  /** Piilottaa tekstin alle md-näkymässä (vain ikoni) */
  compactOnMobile?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const icon =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const text =
    size === "sm" ? "text-[1.05rem]" : size === "lg" ? "text-2xl" : "text-xl";

  const content = (
    <span className="group inline-flex items-center gap-3">
      <span
        className={`${icon} shrink-0 transition-transform duration-300 group-hover:scale-[1.03]`}
      >
        <LogoMark className="h-full w-full drop-shadow-sm" />
      </span>
      {showText && (
        <span
          className={`flex-col leading-none ${text} ${compactOnMobile ? "hidden sm:flex" : "flex"}`}
        >
          <span className="bg-gradient-to-r from-slate-900 via-sky-900 to-sky-700 bg-clip-text font-semibold tracking-tight text-transparent">
            Remonttireitti
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-orange-600/90 sm:text-[11px]">
            Lämpöpumput
          </span>
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2"
    >
      <NavLinkPendingContent>{content}</NavLinkPendingContent>
    </Link>
  );
}

export function LogoHero() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Logo href="/" size="lg" />
    </div>
  );
}