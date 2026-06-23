import type { ComponentType } from "react";

type IconProps = { className?: string };

export function NavIconHome({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIconVentilation({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 14h6M14 10h6M7 14a3 3 0 1 0 0-6M17 10a3 3 0 1 0 0-6" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconHeating({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3c2 4 4 6 4 9a4 4 0 1 1-8 0c0-3 2-5 4-9Z" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIconLights({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 18h6M10 22h4M12 2v1M5.6 5.6l.7.7M18.4 5.6l-.7.7M4 12h1M19 12h1M8 14a4 4 0 1 1 8 0c0 2-1 3-2 4H10c-1-1-2-2-2-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIconSecurity({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3 20 7v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4Z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavIconSettings({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconChevron({ className = "h-4 w-4", collapsed }: IconProps & { collapsed: boolean }) {
  return (
    <svg
      className={`${className} transition-transform ${collapsed ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const NAV_ICONS: Record<string, ComponentType<IconProps>> = {
  overview: NavIconHome,
  ventilation: NavIconVentilation,
  heating: NavIconHeating,
  security: NavIconSecurity,
  lights: NavIconLights,
  settings: NavIconSettings,
};
