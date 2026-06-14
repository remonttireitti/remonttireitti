import { CookieConsentBanner } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import type { ReactNode } from "react";
import { Suspense } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
        <PageViewTracker />
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
