import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROPERTY_DOCUMENT_ALLOWED_MIME,
  PROPERTY_DOCUMENT_MAX_BYTES,
  PROPERTY_DOCUMENT_MAX_FILES,
  PROPERTY_DOCUMENTS_BUCKET,
  parsePropertyDocumentKind,
  sanitizePropertyDocumentName,
  type PropertyDocumentFileKind,
} from "@/lib/property-document-kinds";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyComponentFileKind = PropertyDocumentFileKind;

export {
  PROPERTY_DOCUMENT_FILE_KIND_LABELS as PROPERTY_COMPONENT_FILE_KIND_LABELS,
  PROPERTY_DOCUMENT_FILE_KINDS as PROPERTY_COMPONENT_FILE_KINDS,
  formatPropertyDocumentFileSize as formatComponentFileSize,
} from "@/lib/property-document-kinds";

export type PropertyComponentFileRow = {
  id: string;
  component_id: string;
  property_id: string;
  kind: PropertyComponentFileKind;
  label: string | null;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export type PropertyComponentFileView = PropertyComponentFileRow & {
  url: string;
};

export async function uploadPropertyComponentFilesFromFormData(
  propertyId: string,
  componentId: string,
  customerId: string,
  formData: FormData,
): Promise<void> {
  const files = formData
    .getAll("component_files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return;
  if (files.length > PROPERTY_DOCUMENT_MAX_FILES) {
    throw new Error(
      `Enintään ${PROPERTY_DOCUMENT_MAX_FILES} tiedostoa kerralla.`,
    );
  }

  const kind = parsePropertyDocumentKind(String(formData.get("file_kind") ?? "muu"));
  const label = String(formData.get("file_label") ?? "").trim() || null;

  const admin = createAdminClient();

  for (const file of files) {
    if (!PROPERTY_DOCUMENT_ALLOWED_MIME.has(file.type)) {
      throw new Error(
        "Sallittuja tiedostoja ovat PDF ja kuvat (JPEG, PNG, WebP).",
      );
    }
    if (file.size > PROPERTY_DOCUMENT_MAX_BYTES) {
      throw new Error(`Tiedosto ${file.name} on liian suuri (max 10 Mt).`);
    }

    const safeName = sanitizePropertyDocumentName(file.name || "tiedosto");
    const storagePath = `${propertyId}/components/${componentId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from(PROPERTY_DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      throw new Error("Tiedoston tallennus epäonnistui.");
    }

    const { error: rowErr } = await admin
      .from("property_component_files")
      .insert({
        component_id: componentId,
        property_id: propertyId,
        customer_id: customerId,
        kind,
        label,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      });

    if (rowErr) {
      await admin.storage.from(PROPERTY_DOCUMENTS_BUCKET).remove([storagePath]);
      throw new Error("Tiedoston metatiedon tallennus epäonnistui.");
    }
  }
}

export async function fetchPropertyComponentFiles(
  supabase: SupabaseClient,
  componentIds: string[],
): Promise<Map<string, PropertyComponentFileView[]>> {
  const result = new Map<string, PropertyComponentFileView[]>();
  if (componentIds.length === 0) return result;

  const { data: rows } = await supabase
    .from("property_component_files")
    .select(
      "id, component_id, property_id, kind, label, storage_path, original_name, mime_type, file_size_bytes, created_at",
    )
    .in("component_id", componentIds)
    .order("created_at", { ascending: false });

  for (const row of rows ?? []) {
    const { data: signed } = await supabase.storage
      .from(PROPERTY_DOCUMENTS_BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);

    if (!signed?.signedUrl) continue;

    const view = { ...(row as PropertyComponentFileRow), url: signed.signedUrl };
    const list = result.get(row.component_id) ?? [];
    list.push(view);
    result.set(row.component_id, list);
  }

  return result;
}

export async function deletePropertyComponentFileRecord(
  fileId: string,
  customerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("property_component_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Tiedostoa ei löydy." };

  await admin.storage.from(PROPERTY_DOCUMENTS_BUCKET).remove([row.storage_path]);
  const { error } = await admin
    .from("property_component_files")
    .delete()
    .eq("id", fileId);

  if (error) return { ok: false, error: "Poisto epäonnistui." };
  return { ok: true };
}
