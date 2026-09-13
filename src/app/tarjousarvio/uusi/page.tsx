import { redirect } from "next/navigation";
import Link from "next/link";
import { EvaluationRequestForm } from "@/components/bid-evaluation/evaluation-request-form";
import { SiteHeader } from "@/components/site-header";
import { evaluationCategoryForJobSlug } from "@/lib/bid-evaluation";
import { brand } from "@/lib/brand-theme";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjousarvio/uusi");

  const { project } = await searchParams;

  let defaultCategory = "lammitys";
  if (project) {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("projects")
      .select("job_types ( slug )")
      .eq("id", project)
      .eq("customer_id", user.id)
      .maybeSingle();
    const jt = row?.job_types as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(jt) ? jt[0]?.slug : jt?.slug;
    if (slug) defaultCategory = evaluationCategoryForJobSlug(slug);
  }

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
          ← Tarjousvahti
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Uusi arviopyyntö</h1>
        <EvaluationRequestForm projectId={project} defaultCategory={defaultCategory} />
      </main>
    </div>
  );
}
