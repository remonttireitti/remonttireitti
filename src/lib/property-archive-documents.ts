import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROPERTY_DOCUMENT_ALLOWED_MIME,
  PROPERTY_DOCUMENT_MAX_BYTES,
  PROPERTY_DOCUMENT_MAX_FILES,
  PROPERTY_DOCUMENTS_BUCKET,
  formatPropertyDocumentFileSize,
  parsePropertyArchiveDocumentKind,
  sanitizePropertyDocumentName,
  type PropertyArchiveDocumentKind,
} from "@/lib/property-document-kinds";
import type { SupabaseClient } from "@supabase/supabase-js";

export {
  PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS,
  PROPERTY_ARCHIVE_DOCUMENT_KINDS,
  formatPropertyDocumentFileSize as formatArchiveDocumentSize,
} from "@/lib/property-document-kinds";

export type PropertyArchiveDocumentRow = {
  id: string;
  property_id: string;
  kind: PropertyArchiveDocumentKind;
  label: string | null;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export type PropertyArchiveDocumentView = PropertyArchiveDocumentRow & {
  url: string;
};

export async function uploadPropertyArchiveDocumentsFromFormData(
  propertyId: string,
  customerId: string,
  formData: FormData,
): Promise<void> {
  const files = formData
    .getAll("archive_documents")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return;
  if (files.length > PROPERTY_DOCUMENT_MAX_FILES) {
    throw new Error(
      `Enintään ${PROPERTY_DOCUMENT_MAX_FILES} tiedostoa kerralla.`,
    );
  }

  const kind = parsePropertyArchiveDocumentKind(
    String(formData.get("document_kind") ?? "muu"),
  );
  const label = String(formData.get("document_label") ?? "").trim() || null;

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
    const storagePath = `${propertyId}/archive/${crypto.randomUUID()}-${safeName}`;
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
      .from("property_archive_documents")
      .insert({
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

export async function fetchPropertyArchiveDocuments(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<PropertyArchiveDocumentView[]> {
  const { data: rows } = await supabase
    .from("property_archive_documents")
    .select(
      "id, property_id, kind, label, storage_path, original_name, mime_type, file_size_bytes, created_at",
    )
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  const result: PropertyArchiveDocumentView[] = [];

  for (const row of rows ?? []) {
    const { data: signed } = await supabase.storage
      .from(PROPERTY_DOCUMENTS_BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);

    if (!signed?.signedUrl) continue;

    result.push({
      ...(row as PropertyArchiveDocumentRow),
      url: signed.signedUrl,
    });
  }

  return result;
}

export async function deletePropertyArchiveDocumentRecord(
  documentId: string,
  customerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("property_archive_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Asiakirjaa ei löydy." };

  await admin.storage.from(PROPERTY_DOCUMENTS_BUCKET).remove([row.storage_path]);
  const { error } = await admin
    .from("property_archive_documents")
    .delete()
    .eq("id", documentId);

  if (error) return { ok: false, error: "Poisto epäonnistui." };
  return { ok: true };
}
