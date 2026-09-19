import Link from "next/link";
import { brand } from "@/lib/brand-theme";

export function CalculatorCtaBanner({
  jobSlug = "kylpyhuone",
  title = "Saat tarkan hinnan kilpailuttamalla",
  body = "Laskuri antaa suuntaa-antavan arvion. Kun haluat oikean tarjouksen, jätä ilmainen tarjouspyyntö — urakoitsijat näkevät työn laajuuden ja vastaavat alueellisilla hinnoilla.",
}: {
  jobSlug?: string;
  title?: string;
  body?: string;
}) {
  return (
    <aside className="rounded-2xl border border-orange-200 bg-orange-50/80 px-5 py-4 sm:px-6">
      <p className="font-semibold text-orange-950">{title}</p>
      <p className="mt-1 text-sm text-orange-900/90">{body}</p>
      <Link
        href={`/remontti/uusi?tyyppi=${jobSlug}`}
        className={`${brand.btnPrimary} mt-3 inline-flex text-sm`}
      >
        Jätä tarjouspyyntö — maksutta →
      </Link>
    </aside>
  );
}
