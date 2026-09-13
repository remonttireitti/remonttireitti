import { GuidedRequestIllustration } from "@/components/marketing/guided-request-illustration";

export function HomeHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-lg shadow-violet-100/40 ring-1 ring-violet-50">
        <GuidedRequestIllustration className="h-auto w-full" />
      </div>
      <p className="mt-3 text-center text-xs text-stone-500 lg:text-left">
        Valitse kohta → teksti lisätään kuvaukseen → laatupiste päivittyy
      </p>
    </div>
  );
}
