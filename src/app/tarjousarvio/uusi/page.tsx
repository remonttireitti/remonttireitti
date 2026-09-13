import { redirect } from "next/navigation";
import Link from "next/link";
import { EvaluationRequestForm } from "@/components/bid-evaluation/evaluation-request-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { getSessionUser } from "@/lib/auth";

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjousarvio/uusi");

  const { project } = await searchParams;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
          ← Tarjousvahti
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Uusi arviopyyntö</h1>
        <EvaluationRequestForm projectId={project} />
      </main>
    </div>
  );
}
