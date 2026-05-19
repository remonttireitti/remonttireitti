import { CookieConsentBanner } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
      <CookieConsentBanner />
      {siteConfig.gaId ? (
        <GoogleAnalytics measurementId={siteConfig.gaId} />
      ) : null}
    </>
  );
}
