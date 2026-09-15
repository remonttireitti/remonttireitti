import { RoleAwareLink } from "@/components/navigation/role-aware-link";
import { SeoFigure } from "@/components/marketing/seo-figure";
import { brand } from "@/lib/brand-theme";

const VISUALS = [
  {
    src: "/marketing/kilpailuta-remontti-tarjouspyynto.svg",
    alt: "Remontin tarjouspyyntö — kuvaile kohde ja liitä kuvat",
    title: "Tee pyyntö",
    caption: "Kuvaile kohde kerran.",
    width: 800,
    height: 520,
  },
  {
    src: "/marketing/vertaa-remonttitarjouksia.svg",
    alt: "Vertaa tarjouksia ja tingaa vastatarjouksella",
    title: "Vertaa ja tingaa",
    caption: "Sama muoto, neuvottele hintaa.",
    width: 800,
    height: 520,
  },
  {
    src: "/marketing/lampopumpun-vian-selvitys.svg",
    alt: "Lämpöpumpun ilmainen vian selvitys",
    title: "Lämpöpumppu oireilee?",
    caption: "Ilmainen tarkistuslista.",
    width: 800,
    height: 520,
  },
] as const;

export function HomeSeoContent() {
  return (
    <section
      className="border-t border-stone-200 bg-stone-50 py-12 sm:py-14"
      aria-labelledby="home-visuals-heading"
    >
      <div className={brand.containerWide}>
        <h2
          id="home-visuals-heading"
          className="text-center text-2xl font-bold tracking-tight text-stone-900"
        >
          Pyyntö → tarjoukset → valinta
        </h2>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {VISUALS.map((visual) => (
            <SeoFigure key={visual.src} {...visual} />
          ))}
        </div>

        <p className="mt-8 text-center">
          <RoleAwareLink href="/remontti/uusi" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock} inline-flex`}>
            Jätä tarjouspyyntö – maksutta
          </RoleAwareLink>
        </p>
      </div>
    </section>
  );
}
