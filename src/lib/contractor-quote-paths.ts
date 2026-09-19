export function contractorQuoteHubPath(): string {
  return "/tarjouslaskuri";
}

export function contractorQuoteCalculatorPath(slug: string): string {
  return `/tarjouslaskuri/${slug}`;
}

/** Avaa tallennettu tarjous muokattavaksi laskurissa (päivittää samaa riviä). */
export function contractorQuoteEditPath(slug: string, quoteId: string): string {
  const q = new URLSearchParams({ tarjous: quoteId });
  return `${contractorQuoteCalculatorPath(slug)}?${q.toString()}`;
}

export function contractorQuotePdfDownloadPath(quoteId: string): string {
  return `/tarjouslaskuri/lataus/${quoteId}`;
}
