import { redirect } from "next/navigation";
import Link from "next/link";
import { EvaluationRequestForm } from "@/components/bid-evaluation/evaluation-request-form";
import { SiteHeader } from "@/components/site-header";
import {
  evaluationCategoryForJobSlug,
  parseEvaluationCategory,
} from "@/lib/bid-evaluation";
import { fetchActiveEvaluatorCategorySlugs } from "@/lib/bid-evaluation-availability-server";
import { brand } from "@/lib/brand-theme";
import { getSessionUser } from "@/lib/auth";
import { isHeatPumpJobSlug } from "@/constants/project-areas";
import { createClient } from "@/lib/supabase/server";

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; category?: string; pump?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjousarvio/uusi");

  const { project, category: categoryParam, pump: pumpParam } = await searchParams;
  const availableCategories = await fetchActiveEvaluatorCategorySlugs();

  if (availableCategories.length === 0) {
    return (
      <div className={brand.page}>
        <SiteHeader />
        <main className={brand.mainContent}>
          <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
            ← Tarjousvahti
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Uusi arviopyyntö</h1>
          <p className="mt-4 text-sm text-stone-600">
            Tarjousvahti ei ole tällä hetkellä saatavilla — arvioijia ei ole vielä
            rekisteröitynyt palveluun.
          </p>
        </main>
      </div>
    );
  }

  let jobSlug: string | null = null;
  if (project) {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("projects")
      .select("job_types ( slug )")
      .eq("id", project)
      .eq("customer_id", user.id)
      .maybeSingle();
    const jt = row?.job_types as { slug: string } | { slug: string }[] | null;
    jobSlug = Array.isArray(jt) ? (jt[0]?.slug ?? null) : (jt?.slug ?? null);
  }

  const defaultCategory = categoryParam
    ? parseEvaluationCategory(categoryParam)
    : evaluationCategoryForJobSlug(jobSlug);

  const resolvedCategory = availableCategories.includes(defaultCategory)
    ? defaultCategory
    : availableCategories[0];

  const defaultHeatPumpType =
    pumpParam && isHeatPumpJobSlug(pumpParam)
      ? pumpParam
      : jobSlug && isHeatPumpJobSlug(jobSlug)
        ? jobSlug
        : undefined;

  const showHeatPumpField =
    resolvedCategory === "lammitys" || resolvedCategory === "heat_pump";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
          ← Tarjousvahti
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Uusi arviopyyntö</h1>
        <EvaluationRequestForm
          projectId={project}
          defaultCategory={resolvedCategory}
          defaultHeatPumpType={defaultHeatPumpType}
          showHeatPumpField={showHeatPumpField}
          availableCategories={availableCategories}
        />
      </main>
    </div>
  );
}
