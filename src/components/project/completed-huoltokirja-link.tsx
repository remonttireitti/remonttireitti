import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function CompletedHuoltokirjaLink({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("property_log_entries")
    .select("property_id")
    .eq("project_id", projectId)
    .eq("customer_id", userId)
    .maybeSingle();

  if (!entry?.property_id) return null;

  return (
    <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <h2 className="text-base font-semibold text-stone-900">
        Remontti huoltokirjassa
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Valmistunut urakka on tallennettu huoltokirjaasi. Lisää aiempia työitä ja
        seuraa laitteiden takuita samassa paikassa.
      </p>
      <Link
        href={`/oma-tili/huoltokirja/${entry.property_id}`}
        className="mt-3 inline-block text-sm font-semibold text-sky-800 hover:underline"
      >
        Avaa huoltokirja →
      </Link>
    </section>
  );
}
