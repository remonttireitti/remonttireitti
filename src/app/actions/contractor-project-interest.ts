"use server";

import { revalidatePath } from "next/cache";
import type { ProjectInterest } from "@/lib/contractor-work-filter";
import { createClient } from "@/lib/supabase/server";

export type ContractorInterestActionState = { error?: string; ok?: string };

export async function setContractorProjectInterest(
  _prev: ContractorInterestActionState,
  formData: FormData,
): Promise<ContractorInterestActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  const interestRaw = String(formData.get("interest") ?? "").trim();

  if (!projectId) return { error: "Pyyntö puuttuu." };

  const interest: ProjectInterest | "clear" =
    interestRaw === "interested" || interestRaw === "not_interested"
      ? interestRaw
      : interestRaw === "clear"
        ? "clear"
        : ("" as "clear");

  if (interest !== "interested" && interest !== "not_interested" && interest !== "clear") {
    return { error: "Virheellinen valinta." };
  }

  if (interest === "clear") {
    const { error } = await supabase
      .from("contractor_project_interest")
      .delete()
      .eq("contractor_id", user.id)
      .eq("project_id", projectId);

    if (error) return { error: "Poisto epäonnistui." };
  } else {
    const { error } = await supabase.from("contractor_project_interest").upsert(
      {
        contractor_id: user.id,
        project_id: projectId,
        interest,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contractor_id,project_id" },
    );

    if (error) return { error: "Tallennus epäonnistui." };
  }

  revalidatePath("/tarjoukset");
  revalidatePath(`/tarjoukset/${projectId}`);
  return {
    ok:
      interest === "interested"
        ? "Merkitty kiinnostavaksi."
        : interest === "not_interested"
          ? "Pyyntö piilotettu."
          : "Merkintä poistettu.",
  };
}
