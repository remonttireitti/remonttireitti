"use server";

import { revalidatePath } from "next/cache";
import {
  deletePropertyComponentFileRecord,
  uploadPropertyComponentFilesFromFormData,
} from "@/lib/property-component-files";
import { createClient } from "@/lib/supabase/server";

export type PropertyComponentFileActionState = { error?: string; ok?: string };

async function verifyComponentOwnership(
  propertyId: string,
  componentId: string,
  customerId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_components")
    .select("id")
    .eq("id", componentId)
    .eq("property_id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return !!data;
}

export async function uploadPropertyComponentFiles(
  _prev: PropertyComponentFileActionState,
  formData: FormData,
): Promise<PropertyComponentFileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const componentId = String(formData.get("component_id") ?? "");

  if (!propertyId || !componentId) {
    return { error: "Puuttuva rakennusosa." };
  }

  if (!(await verifyComponentOwnership(propertyId, componentId, user.id))) {
    return { error: "Rakennusosaa ei löydy." };
  }

  try {
    await uploadPropertyComponentFilesFromFormData(
      propertyId,
      componentId,
      user.id,
      formData,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tiedoston lataus epäonnistui.";
    return { error: message };
  }

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Tiedosto tallennettu." };
}

export async function deletePropertyComponentFile(
  _prev: PropertyComponentFileActionState,
  formData: FormData,
): Promise<PropertyComponentFileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");

  if (!propertyId || !fileId) return { error: "Puuttuva tiedosto." };

  const result = await deletePropertyComponentFileRecord(fileId, user.id);
  if (!result.ok) return { error: result.error ?? "Poisto epäonnistui." };

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Tiedosto poistettu." };
}
