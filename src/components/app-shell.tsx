import { CookieConsentBanner } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import type { ReactNode } from "react";
import { Suspense } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {children}
      <SiteFooter />
      <CookieConsentBanner />
      {siteConfig.gaId ? (
        <GoogleAnalytics measurementId={siteConfig.gaId} />
      ) : null}
    </>
  );
}
