"use server";

import { revalidatePath } from "next/cache";
import {
  deletePropertyArchiveDocumentRecord,
  uploadPropertyArchiveDocumentsFromFormData,
} from "@/lib/property-archive-documents";
import { createClient } from "@/lib/supabase/server";

export type PropertyArchiveDocumentActionState = { error?: string; ok?: string };

async function verifyPropertyOwnership(
  propertyId: string,
  customerId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return !!data;
}

export async function uploadPropertyArchiveDocuments(
  _prev: PropertyArchiveDocumentActionState,
  formData: FormData,
): Promise<PropertyArchiveDocumentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) return { error: "Puuttuva kiinteistö." };

  if (!(await verifyPropertyOwnership(propertyId, user.id))) {
    return { error: "Kiinteistöä ei löydy." };
  }

  try {
    await uploadPropertyArchiveDocumentsFromFormData(
      propertyId,
      user.id,
      formData,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tiedoston lataus epäonnistui.";
    return { error: message };
  }

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Asiakirja tallennettu." };
}

export async function deletePropertyArchiveDocument(
  _prev: PropertyArchiveDocumentActionState,
  formData: FormData,
): Promise<PropertyArchiveDocumentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");

  if (!propertyId || !documentId) return { error: "Puuttuva asiakirja." };

  const result = await deletePropertyArchiveDocumentRecord(documentId, user.id);
  if (!result.ok) return { error: result.error ?? "Poisto epäonnistui." };

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Asiakirja poistettu." };
}
