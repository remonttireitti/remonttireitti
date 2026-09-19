import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTRACTOR_BRANDING_BUCKET = "contractor-branding";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function logoExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function validateContractorLogoFile(file: File): string | null {
  if (!file.size) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Logo: vain JPG, PNG tai WebP.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo on liian suuri (max 2 Mt).";
  }
  return null;
}

export async function uploadContractorLogo(
  contractorId: string,
  file: File,
): Promise<string> {
  const validation = validateContractorLogoFile(file);
  if (validation) throw new Error(validation);

  const admin = createAdminClient();
  const ext = logoExtension(file.type);
  const storagePath = `${contractorId}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from(CONTRACTOR_BRANDING_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error("Logon tallennus epäonnistui.");
  }

  return storagePath;
}

export async function removeContractorLogoStorage(
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath?.trim()) return;
  const admin = createAdminClient();
  await admin.storage.from(CONTRACTOR_BRANDING_BUCKET).remove([storagePath]);
}

export async function contractorLogoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  expiresSeconds = 60 * 60,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data } = await supabase.storage
    .from(CONTRACTOR_BRANDING_BUCKET)
    .createSignedUrl(storagePath, expiresSeconds);
  return data?.signedUrl ?? null;
}

export async function contractorLogoBytesForPdf(
  storagePath: string | null | undefined,
): Promise<{ dataUri: string; format: "png" | "jpg" | "webp" } | null> {
  if (!storagePath?.trim()) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CONTRACTOR_BRANDING_BUCKET)
    .download(storagePath);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  const lower = storagePath.toLowerCase();
  const format = lower.endsWith(".png")
    ? "png"
    : lower.endsWith(".webp")
      ? "webp"
      : "jpg";
  const mime =
    format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";

  return {
    dataUri: `data:${mime};base64,${buffer.toString("base64")}`,
    format,
  };
}

export const CONTRACTOR_DESCRIPTION_MAX = 600;

export function normalizeContractorDescription(raw: string): string {
  return raw.trim().slice(0, CONTRACTOR_DESCRIPTION_MAX);
}
