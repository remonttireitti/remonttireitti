/** react-pdf Image tukee luotettavasti vain PNG/JPEG — WebP muunnetaan selainympäristössä. */

export function isPdfSafeImageDataUri(dataUri: string | null | undefined): boolean {
  return Boolean(dataUri && /^data:image\/(png|jpe?g);/i.test(dataUri.trim()));
}

export function pickPdfLogoDataUri(
  logoDataUri?: string | null,
  logoUrl?: string | null,
): string | null {
  for (const candidate of [logoDataUri, logoUrl]) {
    if (isPdfSafeImageDataUri(candidate)) return candidate!.trim();
  }
  for (const candidate of [logoDataUri, logoUrl]) {
    if (candidate?.trim().startsWith("data:image/")) return candidate.trim();
  }
  return null;
}

/** Muuntaa WebP (tai muun data-URI-kuvan) PNG-data-URI:ksi canvasilla. */
export async function ensurePdfSafeLogoDataUri(
  dataUri: string | null | undefined,
): Promise<string | null> {
  const raw = dataUri?.trim() || null;
  if (!raw) return null;
  if (isPdfSafeImageDataUri(raw)) return raw;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (canvas.width < 1 || canvas.height < 1) {
          resolve(null);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = raw;
  });
}
