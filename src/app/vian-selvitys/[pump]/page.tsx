import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import {
  SYMPTOM_SLUGS_BY_PUMP,
  getTroubleshootingGuide,
  isHeatPumpSlug,
  pumpLabel,
  resolveGuideSummaryForPump,
} from "@/lib/troubleshooting-guides";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return Object.keys(SYMPTOM_SLUGS_BY_PUMP).map((pump) => ({ pump }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pump: string }>;
}): Promise<Metadata> {
  const { pump } = await params;
  if (!isHeatPumpSlug(pump)) return {};
  const title = `${pumpLabel(pump)} — vian selvitys`;
  return pageMetadata({
    title,
    description: `Yleisimmät ${pumpLabel(pump).toLowerCase()}-viat ja mitä tarkistaa ennen huoltokutsua.`,
    path: `/vian-selvitys/${pump}`,
  });
}

export default async function TroubleshootingPumpPage({
  params,
}: {
  params: Promise<{ pump: string }>;
}) {
  const { pump } = await params;
  if (!isHeatPumpSlug(pump)) notFound();

  const slugs = SYMPTOM_SLUGS_BY_PUMP[pump];
  const marketing = HEAT_PUMP_MARKETING[pump];

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/vian-selvitys" className="text-sm text-sky-700 hover:underline">
          ← Vian selvitys
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {marketing.title} — valitse oire
        </h1>
        <p className="mt-2 text-stone-600">{marketing.hint}</p>

        <ul className="mt-8 space-y-3">
          {slugs.map((symptomSlug) => {
            const guide = getTroubleshootingGuide(symptomSlug);
            if (!guide) return null;
            return (
              <li key={symptomSlug}>
                <Link
                  href={`/vian-selvitys/${pump}/${symptomSlug}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-300"
                >
                  <span className="font-semibold">{guide.title}</span>
                  <span className="mt-1 block text-sm text-stone-600">
                    {resolveGuideSummaryForPump(guide, pump).slice(0, 120)}…
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
