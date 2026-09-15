import { SessionIdleGuard } from "@/components/auth/session-idle-guard";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Suspense } from "react";

export async function AppShell({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const hideSiteChrome = pathname.startsWith("/mainos");

  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
        <PageViewTracker />
        <SessionIdleGuard />
      </Suspense>
      {children}
      {!hideSiteChrome && (
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      )}
      {!hideSiteChrome && <CookieConsentBanner />}
      {siteConfig.gaId ? (
        <GoogleAnalytics measurementId={siteConfig.gaId} />
      ) : null}
    </>
  );
}
