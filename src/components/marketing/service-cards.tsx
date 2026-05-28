import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";

const services = [
  {
    title: "Asennus",
    description:
      "Kilpailuta ilmalämpö-, vesi-ilmalämpö- tai maalämpöpumppu. Ohjattu lomake kertoo asentajalle kohteesta tarvittavat tiedot.",
    href: "/remontti/uusi",
    cta: "Aloita asennuspyyntö",
    accent: "border-sky-200 bg-sky-50/80",
  },
  {
    title: "Huolto & korjaus",
    description:
      "Aloita vian selvityksestä — tarkista oireen mukaan. Jos ei korjaannu, kilpailuta huolto asentajilta.",
    href: "/vian-selvitys",
    cta: "Vian selvitys → huolto",
    accent: "border-orange-200 bg-orange-50/60",
  },
  {
    title: marketplaceBrand.nameShort,
    description:
      "Myy tai osta käytettyjä ja uusia laitteita, varaosia ja työkaluja. Yksityishenkilölle ilmoittaminen on ilmaista.",
    href: "/markkinapaikka",
    cta: "Selaa toria",
    accent: "border-stone-200 bg-white",
  },
] as const;

export function ServiceCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
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
