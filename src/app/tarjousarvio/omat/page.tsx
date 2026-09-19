import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { BID_EVALUATION_STATUS_LABELS } from "@/lib/bid-evaluation";
import { fetchCustomerEvaluationRequests } from "@/lib/bid-evaluation-server";
import { getSessionUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Omat arviopyynnöt",
  description: "Hallinnoi tarjousarvion pyyntöjäsi.",
  path: "/tarjousarvio/omat",
  noIndex: true,
});

export default async function MyEvaluationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjousarvio/omat");

  const supabase = await createClient();
  const requests = await fetchCustomerEvaluationRequests(supabase, user.id);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
          ← Tarjousvahti
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Omat arviopyynnöt</h1>

        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">
            Ei vielä pyyntöjä.{" "}
            <Link href="/tarjousarvio" className={brand.link}>
              Aloita tarjousarvio
            </Link>
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <div>
                  <p className="font-medium text-stone-900">
                    {new Date(r.created_at).toLocaleDateString("fi-FI")}
                  </p>
                  <p className="text-sm text-stone-600">
                    {BID_EVALUATION_STATUS_LABELS[r.status]}
                  </p>
                </div>
                <Link
                  href={
                    r.status === "draft"
                      ? `/tarjousarvio/${r.id}/muokkaa`
                      : `/tarjousarvio/${r.id}`
                  }
                  className={brand.link}
                >
                  Avaa →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
