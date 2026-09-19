import { ContractorBidDefaultsForm } from "@/components/contractor/contractor-bid-defaults-form";
import { ContractorBillingForm } from "@/components/contractor/contractor-billing-form";
import { ContractorBrandingForm } from "@/components/contractor/contractor-branding-form";
import { ContractorPricingRatesForm } from "@/components/contractor/contractor-pricing-rates-form";
import { ContractorProfileForm } from "@/components/contractor/contractor-profile-form";
import { ContractorServiceAreaForm } from "@/components/contractor/contractor-service-area-form";
import { ContractorWorkPreferencesForm } from "@/components/contractor/contractor-work-preferences-form";
import type { ContractorAccountSettingsData } from "@/lib/contractor-account-settings-server";

export function ContractorSettingsPanel({
  settings,
}: {
  settings: ContractorAccountSettingsData;
}) {
  const {
    contractorQuals,
    contractorTrades,
    heatPumpJobTypes,
    serviceAreaFields,
    minBudgetEur,
    foundedYear,
    companySizeBand,
    billingFields,
    brandingFields,
    bidDefaultsBundle,
    pricingRates,
    requireCompanyFacts,
  } = settings;

  return (
    <div className="space-y-8">
      <ContractorBidDefaultsForm className="mt-0" {...bidDefaultsBundle} />

      <div id="laskentaparametrit" className="scroll-mt-24">
        <ContractorPricingRatesForm className="mt-0" rates={pricingRates} />
      </div>

      <ContractorServiceAreaForm
        className="mt-0"
        servicePostalCode={serviceAreaFields.servicePostalCode}
        serviceMunicipality={serviceAreaFields.serviceMunicipality}
        maxTravelKm={serviceAreaFields.maxTravelKm}
      />

      <ContractorWorkPreferencesForm className="mt-0" minBudgetEur={minBudgetEur} />

      <ContractorBrandingForm
        id="branding"
        className="mt-0 scroll-mt-24"
        description={brandingFields.description}
        logoUrl={brandingFields.logoUrl}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {contractorTrades.length > 0 && (
          <ContractorProfileForm
            id="yritystiedot"
            className="mt-0 scroll-mt-24"
            trades={contractorTrades}
            jobTypes={heatPumpJobTypes}
            companyName={contractorQuals.companyName}
            tradeIds={contractorQuals.tradeIds}
            jobTypeIds={contractorQuals.jobTypeIds}
            refrigerantLicense={contractorQuals.refrigerantLicense}
            electricalQualification={contractorQuals.electricalQualification}
            lviQualifications={contractorQuals.lviQualifications}
            foundedYear={foundedYear}
            companySizeBand={companySizeBand}
            requireCompanyFacts={requireCompanyFacts}
          />
        )}

        <ContractorBillingForm
          className="mt-0"
          businessId={billingFields.businessId}
          billingEmail={billingFields.billingEmail}
          billingAddressLine={billingFields.billingAddressLine}
          billingPostalCode={billingFields.billingPostalCode}
          billingCity={billingFields.billingCity}
        />
      </div>
    </div>
  );
}
