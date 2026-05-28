import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TroubleshootingChecklist } from "@/components/troubleshooting/troubleshooting-checklist";
import { getSessionUser } from "@/lib/auth";
import {
  SYMPTOM_SLUGS_BY_PUMP,
  getTroubleshootingGuide,
  isHeatPumpSlug,
  pumpLabel,
  buildTroubleshootingHuoltoQuery,
  resolveGuideSummaryForPump,
} from "@/lib/troubleshooting-guides";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  const params: { pump: string; symptom: string }[] = [];
  for (const pump of Object.keys(SYMPTOM_SLUGS_BY_PUMP)) {
    if (!isHeatPumpSlug(pump)) continue;
    for (const symptom of SYMPTOM_SLUGS_BY_PUMP[pump]) {
      params.push({ pump, symptom });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pump: string; symptom: string }>;
}): Promise<Metadata> {
  const { pump, symptom } = await params;
  if (!isHeatPumpSlug(pump)) return {};
  const guide = getTroubleshootingGuide(symptom);
  if (!guide) return {};
  return pageMetadata({
    title: `${guide.title} — ${pumpLabel(pump)}`,
    description: resolveGuideSummaryForPump(guide, pump),
    path: `/vian-selvitys/${pump}/${symptom}`,
  });
}

export default async function TroubleshootingGuidePage({
  params,
}: {
  params: Promise<{ pump: string; symptom: string }>;
}) {
  const { pump, symptom } = await params;
  if (!isHeatPumpSlug(pump)) notFound();
  if (!SYMPTOM_SLUGS_BY_PUMP[pump].includes(symptom)) notFound();

  const guide = getTroubleshootingGuide(symptom);
  if (!guide) notFound();

  const user = await getSessionUser();
  const huoltoQuery = buildTroubleshootingHuoltoQuery({
    pumpSlug: pump,
    guide,
    triedCheckIds: [],
  });
  const huoltoPath = `/huolto/uusi?${huoltoQuery}`;
  const loginHref = user
    ? undefined
    : `/kirjaudu?redirect=${encodeURIComponent(huoltoPath)}`;

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href={`/vian-selvitys/${pump}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← {pumpLabel(pump)} — oireet
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{guide.title}</h1>
        <p className="mt-2 text-stone-600">
          {resolveGuideSummaryForPump(guide, pump)}
        </p>

        <div className="mt-8">
          <TroubleshootingChecklist
            pumpSlug={pump}
            guide={guide}
            loginHref={loginHref}
          />
        </div>
      </main>
    </div>
  );
}
