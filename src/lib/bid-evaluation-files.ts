import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BID_EVALUATION_BUCKET = "bid-evaluation-files";
export const BID_EVALUATION_MAX_FILES = 3;
export const BID_EVALUATION_MAX_BYTES = 10 * 1024 * 1024;

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

export type BidEvaluationFileRow = {
  id: string;
  item_id: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string;
};

export async function uploadBidEvaluationFiles(
  itemId: string,
  files: File[],
): Promise<void> {
  if (files.length === 0) return;
  if (files.length > BID_EVALUATION_MAX_FILES) {
    throw new Error(`Enintään ${BID_EVALUATION_MAX_FILES} tiedostoa per tarjous.`);
  }

  const admin = createAdminClient();

  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error("Sallittu: PDF tai kuva (JPEG, PNG, WebP).");
    }
    if (file.size > BID_EVALUATION_MAX_BYTES) {
      throw new Error(`Tiedosto ${file.name} on liian suuri (max 10 Mt).`);
    }

    const safeName = sanitizeFileName(file.name || "tarjous.pdf");
    const storagePath = `${itemId}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await admin.storage
      .from(BID_EVALUATION_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw new Error("Tiedoston tallennus epäonnistui.");

    const { error: rowErr } = await admin.from("bid_evaluation_files").insert({
      item_id: itemId,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type,
    });

    if (rowErr) throw new Error("Tiedoston metatiedon tallennus epäonnistui.");
  }
}

export async function fetchBidEvaluationFilesForItems(
  supabase: SupabaseClient,
  itemIds: string[],
): Promise<Map<string, (BidEvaluationFileRow & { url: string })[]>> {
  const map = new Map<string, (BidEvaluationFileRow & { url: string })[]>();
  if (itemIds.length === 0) return map;

  const { data: rows } = await supabase
    .from("bid_evaluation_files")
    .select("id, item_id, storage_path, original_name, mime_type")
    .in("item_id", itemIds);

  for (const row of rows ?? []) {
    const { data: signed } = await supabase.storage
      .from(BID_EVALUATION_BUCKET)
      .createSignedUrl(row.storage_path as string, 3600);

    const entry = {
      ...(row as BidEvaluationFileRow),
      url: signed?.signedUrl ?? "",
    };
    const list = map.get(row.item_id as string) ?? [];
    list.push(entry);
    map.set(row.item_id as string, list);
  }

  return map;
}
