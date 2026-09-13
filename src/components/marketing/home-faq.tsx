import Link from "next/link";
import { FaqJsonLd } from "@/components/marketing/faq-json-ld";
import { HOME_FAQ_ITEMS } from "@/lib/home-faq";
import { brand } from "@/lib/brand-theme";

export function HomeFaq() {
  return (
    <section
      id="ukk"
      className="border-t border-stone-200 bg-white py-14 sm:py-16"
      aria-labelledby="home-faq-heading"
    >
      <FaqJsonLd items={HOME_FAQ_ITEMS} />
      <div className={brand.containerWide}>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
          Usein kysyttyä
        </p>
        <h2 id="home-faq-heading" className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Remontin kilpailutus — yleiset kysymykset
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Vastaukset siihen, miten kilpailutus toimii Remonttireitissä ja mitä
          kannattaa ottaa huomioon ennen urakoitsijan valintaa.
        </p>

        <dl className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-stone-50/50">
          {HOME_FAQ_ITEMS.map((item) => (
            <div key={item.id} className="px-5 py-5 sm:px-6">
              <dt className="text-base font-semibold text-stone-900">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-stone-700">{item.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link href="/remontti/uusi" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}>
            Aloita ilmainen tarjouspyyntö
          </Link>
          <Link href="/vian-selvitys" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
            Lämpöpumpun vian selvitys
          </Link>
        </div>
      </div>
    </section>
  );
}
