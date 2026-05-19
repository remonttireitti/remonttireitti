import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "project-photos";
const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

export type ProjectPhotoRow = {
  id: string;
  storage_path: string;
  original_name: string | null;
  sort_order: number;
};

export type ProjectPhotoView = ProjectPhotoRow & {
  url: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadProjectPhotosFromFormData(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const entries = formData
    .getAll("project_photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (entries.length === 0) return;
  if (entries.length > MAX_FILES) {
    throw new Error(`Enintään ${MAX_FILES} kuvaa.`);
  }

  const admin = createAdminClient();

  for (let i = 0; i < entries.length; i++) {
    const file = entries[i];
    if (!file.type.startsWith("image/")) {
      throw new Error("Vain kuvatiedostot ovat sallittuja.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`Kuva ${file.name} on liian suuri (max 5 Mt).`);
    }

    const safeName = sanitizeFileName(file.name || `kuva-${i + 1}.jpg`);
    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      throw new Error("Kuvan tallennus epäonnistui.");
    }

    const { error: rowErr } = await admin.from("project_photos").insert({
      project_id: projectId,
      storage_path: storagePath,
      original_name: file.name,
      sort_order: i,
    });

    if (rowErr) {
      throw new Error("Kuvan metatiedon tallennus epäonnistui.");
    }
  }
}

export async function fetchProjectPhotos(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectPhotoView[]> {
  const { data: rows, error } = await supabase
    .from("project_photos")
    .select("id, storage_path, original_name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error || !rows?.length) return [];

  const views: ProjectPhotoView[] = [];
  for (const row of rows) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);

    if (!signed?.signedUrl) continue;
    views.push({ ...row, url: signed.signedUrl });
  }
  return views;
}
