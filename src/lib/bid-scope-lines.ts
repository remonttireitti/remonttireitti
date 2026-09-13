import { scopeCheckItemsForJob } from "@/lib/bid-comparison-insights";

export type BidScopeLine = {
  id: string;
  label: string;
  value: string;
  /** Työlajin oletuskohdat — ei poisteta yhdellä klikkauksella. */
  seeded?: boolean;
  /** scopeCheckItemsForJob -kohdan tunniste. */
  itemId?: string;
};

/** Laajuuskentät joilla on oma lomakekenttä tai ei kuulu laajuuslistaan. */
export const NON_SCOPE_LINE_ITEM_IDS = new Set([
  "timeline",
  "warranty",
  "terms",
]);

export function newScopeLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sl_${crypto.randomUUID()}`;
  }
  return `sl_${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizeScopeLineLabel(label: string): string {
  return label.trim().toLowerCase();
}

/** Pilkkoo tallennetun scope_terms -tekstin erillisiksi riveiksi. */
export function parseScopeTerms(text: string): BidScopeLine[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const hasBullets = trimmed.split("\n").some((l) => l.trim().startsWith("•"));
  if (!hasBullets) {
    return [{ id: newScopeLineId(), label: "", value: trimmed }];
  }

  const lines: BidScopeLine[] = [];
  for (const raw of trimmed.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("•")) {
      const content = line.replace(/^•\s*/, "").trim();
      const colonIdx = content.indexOf(":");
      if (colonIdx > 0) {
        lines.push({
          id: newScopeLineId(),
          label: content.slice(0, colonIdx).trim(),
          value: content.slice(colonIdx + 1).trim(),
        });
      } else {
        lines.push({
          id: newScopeLineId(),
          label: content,
          value: "",
        });
      }
      continue;
    }

    const last = lines[lines.length - 1];
    if (last) {
      last.value = last.value ? `${last.value}\n${line}` : line;
    }
  }

  return lines;
}

/** Yhdistää rivit takaisin scope_terms -kentän arvoksi. Tyhjät otsikot jätetään pois. */
export function serializeScopeLines(lines: BidScopeLine[]): string {
  return lines
    .map((line) => {
      const label = line.label.trim();
      const value = line.value.trim();
      if (label && value) return `• ${label}: ${value}`;
      if (!label && value) return value;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function scopeLineFilled(line: BidScopeLine): boolean {
  return line.value.trim().length >= 4;
}

/** Luo työlajin mukaiset laajuuskentät + yhdistää tallennetun tekstin. */
export function buildSeededScopeLines(
  jobSlug: string | null,
  existingText: string,
): BidScopeLine[] {
  const seedItems = scopeCheckItemsForJob(jobSlug).filter(
    (item) => !NON_SCOPE_LINE_ITEM_IDS.has(item.id),
  );
  const parsed = parseScopeTerms(existingText);
  const consumed = new Set<number>();
  const merged: BidScopeLine[] = [];

  for (const item of seedItems) {
    let matchIdx = findScopeLineIndexByLabel(parsed, item.label);
    if (matchIdx < 0) {
      matchIdx = parsed.findIndex(
        (line, idx) =>
          !consumed.has(idx) &&
          item.keywords.some((keyword) =>
            normalizeScopeLineLabel(line.label).includes(
              normalizeScopeLineLabel(keyword),
            ),
          ),
      );
    }

    if (matchIdx >= 0) {
      consumed.add(matchIdx);
      const matched = parsed[matchIdx]!;
      merged.push({
        ...matched,
        label: item.label,
        itemId: item.id,
        seeded: true,
      });
    } else {
      merged.push({
        id: newScopeLineId(),
        label: item.label,
        value: "",
        itemId: item.id,
        seeded: true,
      });
    }
  }

  for (let i = 0; i < parsed.length; i++) {
    if (consumed.has(i)) continue;
    const line = parsed[i]!;
    if (!line.label.trim() && !line.value.trim()) continue;
    merged.push({ ...line, seeded: false });
  }

  return merged;
}

export function findScopeLineIndexByLabel(
  lines: BidScopeLine[],
  label: string,
): number {
  const norm = normalizeScopeLineLabel(label);
  if (!norm) return -1;
  return lines.findIndex(
    (line) => normalizeScopeLineLabel(line.label) === norm,
  );
}

export function findScopeLineIndexByItemId(
  lines: BidScopeLine[],
  itemId: string,
): number {
  return lines.findIndex((line) => line.itemId === itemId);
}

export function mergeScopeLines(
  existing: BidScopeLine[],
  incoming: BidScopeLine[],
  mode: "append" | "replace",
): BidScopeLine[] {
  if (mode === "replace") {
    return incoming.length > 0 ? incoming : existing;
  }

  const merged = [...existing];
  for (const line of incoming) {
    const idx = findScopeLineIndexByLabel(merged, line.label);
    if (idx >= 0) {
      const current = merged[idx]!;
      merged[idx] = {
        ...current,
        value: current.value.trim()
          ? `${current.value.trim()}\n${line.value.trim()}`.trim()
          : line.value.trim(),
      };
    } else {
      merged.push({ ...line, id: newScopeLineId() });
    }
  }
  return merged;
}
