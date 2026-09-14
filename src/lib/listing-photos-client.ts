const MAX_FILES = 8;

export async function uploadListingPhotosClient(
  listingId: string,
  files: File[],
): Promise<{ ok: boolean; error?: string }> {
  if (files.length === 0) return { ok: true };
  if (files.length > MAX_FILES) {
    return { ok: false, error: `Enintään ${MAX_FILES} kuvaa.` };
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("listing_photos", file);
  }

  let res: Response;
  try {
    res = await fetch(`/api/markkinapaikka/ilmoitukset/${listingId}/photos`, {
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, error: "Kuvien lähetys epäonnistui. Yritä uudelleen." };
  }

  if (!res.ok) {
    let message = "Kuvien tallennus epäonnistui.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    return { ok: false, error: message };
  }

  return { ok: true };
}

/** Poistaa tiedostokentät — server action saa vain tekstikentät. */
export function listingFormDataWithoutPhotos(formData: FormData): FormData {
  const next = new FormData();
  for (const [key, value] of formData.entries()) {
    if (key === "listing_photos") continue;
    next.append(key, value);
  }
  return next;
}
