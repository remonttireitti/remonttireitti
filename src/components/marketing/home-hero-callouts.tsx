import { GuestQuoteRequestCallout } from "@/components/marketing/guest-quote-request-callout";
import { HomeHelpCallout } from "@/components/marketing/home-help-callout";

/** Vierailijoille kaksipalstainen pänneri; kirjautuneille vain kompakti Apu-rivi. */
export function HomeHeroCallouts({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  if (isLoggedIn) {
    return (
      <HomeHelpCallout
        isLoggedIn
        variant="compact"
        className="mb-6"
      />
    );
  }

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      <GuestQuoteRequestCallout
        variant="strip"
        className="mb-0 h-full text-left"
      />
      <HomeHelpCallout className="h-full" />
    </div>
  );
}
