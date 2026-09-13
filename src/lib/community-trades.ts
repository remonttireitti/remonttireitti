import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_NAME_LENGTH = 60;
const MIN_NAME_LENGTH = 2;

export function normalizeTradeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function slugifyTradeName(name: string): string {
  return normalizeTradeName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function validateTradeName(name: string): string | null {
  const normalized = normalizeTradeName(name);
  if (normalized.length < MIN_NAME_LENGTH) {
    return "Ammatin nimen pitää olla vähintään 2 merkkiä.";
  }
  if (normalized.length > MAX_NAME_LENGTH) {
    return `Ammatin nimi saa olla enintään ${MAX_NAME_LENGTH} merkkiä.`;
  }
  return null;
}

async function findExistingTradeId(
  db: SupabaseClient,
  normalizedName: string,
  slug: string,
): Promise<string | null> {
  const { data: bySlug } = await db
    .from("trades")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await db
    .from("trades")
    .select("id, name_fi")
    .ilike("name_fi", normalizedName)
    .limit(1)
    .maybeSingle();

  if (byName?.id) return byName.id as string;

  return null;
}

export async function resolveOrCreateCommunityTrades(
  names: string[],
  createdBy: string,
  db: SupabaseClient = createAdminClient(),
): Promise<{ ids: string[]; error?: string }> {
  const ids: string[] = [];
  const seenNames = new Set<string>();

  for (const raw of names) {
    const normalized = normalizeTradeName(raw);
    if (!normalized) continue;

    const validationError = validateTradeName(normalized);
    if (validationError) return { ids: [], error: validationError };

    const dedupeKey = normalized.toLowerCase();
    if (seenNames.has(dedupeKey)) continue;
    seenNames.add(dedupeKey);

    const baseSlug = slugifyTradeName(normalized);
    if (!baseSlug) {
      return { ids: [], error: "Ammatin nimestä pitää saada tunnistettava muoto." };
    }

    let slug = baseSlug;
    let existingId = await findExistingTradeId(db, normalized, slug);

    if (existingId) {
      ids.push(existingId);
      continue;
    }

    for (let attempt = 0; attempt < 5 && !existingId; attempt += 1) {
      const candidateSlug =
        attempt === 0 ? slug : `${baseSlug}-${attempt + 1}`;

      existingId = await findExistingTradeId(db, normalized, candidateSlug);
      if (existingId) {
        ids.push(existingId);
        break;
      }

      const { data: inserted, error } = await db
        .from("trades")
        .insert({
          slug: candidateSlug,
          name_fi: normalized,
          description_fi: "Yhteisön lisäämä ammatti",
          sort_order: 900,
          is_active: true,
          source: "community",
          created_by: createdBy,
        })
        .select("id")
        .single();

      if (!error && inserted?.id) {
        ids.push(inserted.id as string);
        break;
      }

      if (error?.code === "23505") {
        existingId = await findExistingTradeId(db, normalized, candidateSlug);
        if (existingId) {
          ids.push(existingId);
          break;
        }
        slug = candidateSlug;
        continue;
      }

      return { ids: [], error: error?.message ?? "Ammatin luonti epäonnistui." };
    }
  }

  return { ids };
}

export function parseCustomTradeNames(formData: FormData): string[] {
  const names = formData
    .getAll("custom_trade_names")
    .map((v) => normalizeTradeName(String(v)))
    .filter(Boolean);

  return [...new Set(names.map((n) => n.toLowerCase()))].map((lower) =>
    names.find((n) => n.toLowerCase() === lower)!,
  );
}
