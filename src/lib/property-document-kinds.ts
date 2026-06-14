export type PropertyDocumentFileKind = "kuitti" | "kayttoohje" | "takuu" | "muu";

export const PROPERTY_DOCUMENT_FILE_KIND_LABELS: Record<
  PropertyDocumentFileKind,
  string
> = {
  kuitti: "Kuitti / lasku",
  kayttoohje: "Käyttöohje",
  takuu: "Takuutodistus",
  muu: "Muu tiedosto",
};

export const PROPERTY_DOCUMENT_FILE_KINDS = Object.keys(
  PROPERTY_DOCUMENT_FILE_KIND_LABELS,
) as PropertyDocumentFileKind[];

export const PROPERTY_DOCUMENTS_BUCKET = "property-documents";
export const PROPERTY_DOCUMENT_MAX_FILES = 5;
export const PROPERTY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const PROPERTY_DOCUMENT_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function sanitizePropertyDocumentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function parsePropertyDocumentKind(value: string): PropertyDocumentFileKind {
  const v = value.trim() as PropertyDocumentFileKind;
  return PROPERTY_DOCUMENT_FILE_KINDS.includes(v) ? v : "muu";
}

export function formatPropertyDocumentFileSize(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} kt`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mt`;
}

export type PropertyArchiveDocumentKind =
  | "kiinteistokirja"
  | "rakennussuunnitelma"
  | "pohjapiirustus"
  | "energiatodistus"
  | "kartaasto"
  | "isannointi"
  | "vakuutus"
  | "muu";

export const PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS: Record<
  PropertyArchiveDocumentKind,
  string
> = {
  kiinteistokirja: "Kiinteistökirja",
  rakennussuunnitelma: "Rakennussuunnitelma",
  pohjapiirustus: "Pohjapiirustus",
  energiatodistus: "Energiatodistus",
  kartaasto: "Kartaasto / tonttikartta",
  isannointi: "Isännöitsijäntodistus",
  vakuutus: "Vakuutus / vahinkoilmoitus",
  muu: "Muu asiakirja",
};

export const PROPERTY_ARCHIVE_DOCUMENT_KINDS = Object.keys(
  PROPERTY_ARCHIVE_DOCUMENT_KIND_LABELS,
) as PropertyArchiveDocumentKind[];

export function parsePropertyArchiveDocumentKind(
  value: string,
): PropertyArchiveDocumentKind {
  const v = value.trim() as PropertyArchiveDocumentKind;
  return PROPERTY_ARCHIVE_DOCUMENT_KINDS.includes(v) ? v : "muu";
}
