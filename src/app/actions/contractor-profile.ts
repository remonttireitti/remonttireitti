"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseJobTypeIds,
  parseRefrigerantLicense,
  parseWorkCapability,
  validateContractorQualifications,
} from "@/lib/contractor-qualifications";
import { saveContractorQualifications } from "@/lib/save-contractor-qualifications";
import { createClient } from "@/lib/supabase/server";

export type ContractorProfileState = { error?: string; ok?: string };

export async function updateContractorQualifications(
  _prev: ContractorProfileState,
  formData: FormData,
): Promise<ContractorProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const qualErr = validateContractorQualifications(formData);
  if (qualErr) return { error: qualErr };

  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) return { error: "Yrityksen nimi vaaditaan." };

  const saveRes = await saveContractorQualifications({
    contractorId: user.id,
    companyName,
    jobTypeIds: parseJobTypeIds(formData),
    refrigerantLicense: parseRefrigerantLicense(formData)!,
    electricalCapability: parseWorkCapability(
      formData,
      "electrical_capability",
    )!,
    lviCapability: parseWorkCapability(formData, "lvi_capability")!,
  });

  if (saveRes.error) return { error: saveRes.error };

  revalidatePath("/oma-tili");
  return { ok: "Pätevyydet tallennettu." };
}
