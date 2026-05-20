import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "listing-photos";
const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
/** Allekirjoitetut URL:t listauksessa (tunnit). */
const SIGNED_URL_TTL_SEC = 60 * 60 * 24;

export type ListingPhotoRow = {
  id: string;
  storage_path: string;
  original_name: string | null;
  sort_order: number;
};

export type ListingPhotoView = ListingPhotoRow & {
  url: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadListingPhotosFromFormData(
  listingId: string,
  formData: FormData,
): Promise<void> {
  const entries = formData
    .getAll("listing_photos")
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
    const storagePath = `${listingId}/${crypto.randomUUID()}-${safeName}`;
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

    const { error: rowErr } = await admin
      .from("equipment_listing_photos")
      .insert({
        listing_id: listingId,
        storage_path: storagePath,
        original_name: file.name,
        sort_order: i,
      });

    if (rowErr) {
      throw new Error("Kuvan metatiedon tallennus epäonnistui.");
    }
  }
}

/** Ensimmäisen kuvan URL listakorteille (julkaistut ilmoitukset). */
export async function fetchListingCoverUrls(
  listingIds: string[],
): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("equipment_listing_photos")
    .select("listing_id, storage_path, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  const pathByListing = new Map<string, string>();
  for (const row of rows ?? []) {
    if (!pathByListing.has(row.listing_id)) {
      pathByListing.set(row.listing_id, row.storage_path);
    }
  }

  const urls = new Map<string, string>();
  for (const [listingId, storagePath] of pathByListing) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
    if (signed?.signedUrl) urls.set(listingId, signed.signedUrl);
  }
  return urls;
}

export async function fetchListingPhotos(
  listingId: string,
): Promise<ListingPhotoView[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("equipment_listing_photos")
    .select("id, storage_path, original_name, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error || !rows?.length) return [];

  const views: ListingPhotoView[] = [];
  for (const row of rows) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);

    if (!signed?.signedUrl) continue;
    views.push({ ...row, url: signed.signedUrl });
  }
  return views;
}
