import { GuestQuoteRequestCallout } from "@/components/marketing/guest-quote-request-callout";
import { HomeCalculatorCallout } from "@/components/marketing/home-calculator-callout";
import { HomeContractorCalculatorCallout } from "@/components/marketing/home-contractor-calculator-callout";
import { HomeHelpCallout } from "@/components/marketing/home-help-callout";

/** Vierailijoille kaksipalstaiset pännerit; kirjautuneille kompakti Apu + laskurit. */
export function HomeHeroCallouts({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  if (isLoggedIn) {
    return (
      <div className="mb-6 space-y-3">
        <HomeHelpCallout isLoggedIn variant="compact" />
        <div className="grid gap-3 md:grid-cols-2">
          <HomeCalculatorCallout variant="compact" className="h-full" />
          <HomeContractorCalculatorCallout variant="compact" className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <GuestQuoteRequestCallout
          variant="strip"
          className="mb-0 h-full text-left"
        />
        <HomeHelpCallout className="h-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <HomeCalculatorCallout variant="strip" className="h-full" />
        <HomeContractorCalculatorCallout className="h-full" />
      </div>
    </div>
  );
}
