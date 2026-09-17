import { GuestQuoteRequestCallout } from "@/components/marketing/guest-quote-request-callout";
import { HomeHelpCallout } from "@/components/marketing/home-help-callout";

export function HomeHeroCallouts({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      <GuestQuoteRequestCallout
        variant="strip"
        isLoggedIn={isLoggedIn}
        className="mb-0 h-full text-left"
      />
      <HomeHelpCallout isLoggedIn={isLoggedIn} className="h-full" />
    </div>
  );
}
