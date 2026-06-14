import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyDeviceFileKind = "kuitti" | "kayttoohje" | "takuu" | "muu";

export const PROPERTY_DEVICE_FILE_KIND_LABELS: Record<
  PropertyDeviceFileKind,
  string
> = {
  kuitti: "Kuitti / lasku",
  kayttoohje: "Käyttöohje",
  takuu: "Takuutodistus",
  muu: "Muu tiedosto",
};

export const PROPERTY_DEVICE_FILE_KINDS = Object.keys(
  PROPERTY_DEVICE_FILE_KIND_LABELS,
) as PropertyDeviceFileKind[];

export type PropertyDeviceFileRow = {
  id: string;
  device_id: string;
  property_id: string;
  kind: PropertyDeviceFileKind;
  label: string | null;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

export type PropertyDeviceFileView = PropertyDeviceFileRow & {
  url: string;
};

const BUCKET = "property-documents";
const MAX_FILES_PER_UPLOAD = 5;
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function parseFileKind(value: string): PropertyDeviceFileKind {
  const v = value.trim() as PropertyDeviceFileKind;
  return PROPERTY_DEVICE_FILE_KINDS.includes(v) ? v : "muu";
}

export async function uploadPropertyDeviceFilesFromFormData(
  propertyId: string,
  deviceId: string,
  customerId: string,
  formData: FormData,
): Promise<void> {
  const files = formData
    .getAll("device_files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return;
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error(`Enintään ${MAX_FILES_PER_UPLOAD} tiedostoa kerralla.`);
  }

  const kind = parseFileKind(String(formData.get("file_kind") ?? "muu"));
  const label = String(formData.get("file_label") ?? "").trim() || null;

  const admin = createAdminClient();

  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error(
        "Sallittuja tiedostoja ovat PDF ja kuvat (JPEG, PNG, WebP).",
      );
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Tiedosto ${file.name} on liian suuri (max 10 Mt).`);
    }

    const safeName = sanitizeFileName(file.name || "tiedosto");
    const storagePath = `${propertyId}/devices/${deviceId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      throw new Error("Tiedoston tallennus epäonnistui.");
    }

    const { error: rowErr } = await admin.from("property_device_files").insert({
      device_id: deviceId,
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
      await admin.storage.from(BUCKET).remove([storagePath]);
      throw new Error("Tiedoston metatiedon tallennus epäonnistui.");
    }
  }
}

export async function fetchPropertyDeviceFiles(
  supabase: SupabaseClient,
  deviceIds: string[],
): Promise<Map<string, PropertyDeviceFileView[]>> {
  const result = new Map<string, PropertyDeviceFileView[]>();
  if (deviceIds.length === 0) return result;

  const { data: rows } = await supabase
    .from("property_device_files")
    .select(
      "id, device_id, property_id, kind, label, storage_path, original_name, mime_type, file_size_bytes, created_at",
    )
    .in("device_id", deviceIds)
    .order("created_at", { ascending: false });

  for (const row of rows ?? []) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);

    if (!signed?.signedUrl) continue;

    const view = { ...(row as PropertyDeviceFileRow), url: signed.signedUrl };
    const list = result.get(row.device_id) ?? [];
    list.push(view);
    result.set(row.device_id, list);
  }

  return result;
}

export async function deletePropertyDeviceFileRecord(
  fileId: string,
  customerId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("property_device_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Tiedostoa ei löydy." };

  await admin.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await admin
    .from("property_device_files")
    .delete()
    .eq("id", fileId);

  if (error) return { ok: false, error: "Poisto epäonnistui." };
  return { ok: true };
}

export function formatFileSize(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} kt`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mt`;
}
