import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";

const services = [
  {
    title: "Kilpailuta remontti",
    description:
      "Keittiö, kylpyhuone, katto, lämmitys, sähkö… Julkaise tarjouspyyntö ilmaiseksi.",
    href: "/remontti/uusi",
    cta: "Aloita tarjouspyyntö",
    accent: "border-sky-200 bg-sky-50/80",
  },
  {
    title: "Palvelut & kunnossapito",
    description:
      "Siivous, muutto, ikkunanpesu, nurmikon leikkuu, lumityö… Kertaluonteinen tai jatkuva — pyydä tarjous.",
    href: "/palvelut#palvelut",
    cta: "Selaa palveluja",
    accent: "border-emerald-200 bg-emerald-50/60",
  },
  {
    title: "Huolto & korjaus",
    description:
      "Lämpö ei riitä, vuoto tai virhekoodi? Valitse oire — saat turvallisen tarkistuslistan. Jos vika jää, kilpailuta huolto ilmaiseksi.",
    href: "/vian-selvitys",
    cta: "Tarkista oire (vian selvitys)",
    accent: "border-orange-200 bg-orange-50/60",
  },
  {
    title: marketplaceBrand.nameShort,
    description:
      "Myy tai osta remonttiin liittyviä laitteita, varaosia, tarvikkeita ja työkaluja. Yksityishenkilölle ilmoittaminen on ilmaista.",
    href: "/markkinapaikka",
    cta: "Selaa toria",
    accent: "border-stone-200 bg-white",
  },
] as const;

export function ServiceCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
      {services.map((s) => (
        <article
          key={s.href}
          className={`flex flex-col rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${s.accent}`}
        >
          <h3 className="text-lg font-semibold text-stone-900">{s.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
            {s.description}
          </p>
          <Link
            href={s.href}
            className={`${brand.link} mt-4 text-sm font-semibold`}
          >
            {s.cta} →
          </Link>
        </article>
      ))}
    </div>
  );
}
