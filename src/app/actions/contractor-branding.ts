"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeContractorDescription,
  removeContractorLogoStorage,
  uploadContractorLogo,
  validateContractorLogoFile,
} from "@/lib/contractor-branding";
import { clampQuoteValidityDays } from "@/lib/contractor-quote-defaults";
import { createClient } from "@/lib/supabase/server";

export type ContractorBrandingState = { error?: string; ok?: string };

export async function updateContractorBranding(
  _prev: ContractorBrandingState,
  formData: FormData,
): Promise<ContractorBrandingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu");

  const description = normalizeContractorDescription(
    String(formData.get("description") ?? ""),
  );
  const defaultQuoteValidityDays = clampQuoteValidityDays(
    formData.get("default_quote_validity_days"),
  );
  const removeLogo = formData.get("remove_logo") === "on";
  const logoFile = formData.get("logo");
  const hasLogoFile = logoFile instanceof File && logoFile.size > 0;

  if (hasLogoFile) {
    const logoErr = validateContractorLogoFile(logoFile);
    if (logoErr) return { error: logoErr };
  }

  const { data: existing } = await supabase
    .from("contractor_profiles")
    .select("logo_storage_path")
    .eq("id", user.id)
    .maybeSingle();

  let logoStoragePath = existing?.logo_storage_path ?? null;

  try {
    if (removeLogo && logoStoragePath) {
      await removeContractorLogoStorage(logoStoragePath);
      logoStoragePath = null;
    } else if (hasLogoFile) {
      if (logoStoragePath && !removeLogo) {
        await removeContractorLogoStorage(logoStoragePath);
      }
      logoStoragePath = await uploadContractorLogo(user.id, logoFile);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Logon käsittely epäonnistui.",
    };
  }

  const { error } = await supabase
    .from("contractor_profiles")
    .update({
      description: description || null,
      logo_storage_path: logoStoragePath,
      default_quote_validity_days: defaultQuoteValidityDays,
    })
    .eq("id", user.id);

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("default_quote_validity_days") || error.code === "42703") {
      return {
        error:
          "Voimassaolo-sarake puuttuu tietokannasta. Aja migraatio 20260919210000_quote_validity_and_terms.sql.",
      };
    }
    if (msg.includes("logo_storage_path")) {
      return {
        error:
          "Logo-sarake puuttuu tietokannasta. Aja migraatio 20260919170000_contractor_branding.sql.",
      };
    }
    return { error: "Bränditietojen tallennus epäonnistui." };
  }

  revalidatePath("/oma-tili");
  revalidatePath("/oma-tili/yritys");
  revalidatePath("/tarjouslaskuri");
  revalidatePath(`/urakoitsija/${user.id}`);
  return { ok: "Logo, esittelyteksti ja voimassaolo tallennettu." };
}
