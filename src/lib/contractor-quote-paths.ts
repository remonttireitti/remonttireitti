export function contractorQuoteHubPath(): string {
  return "/tarjouslaskuri";
}

export function contractorQuoteCalculatorPath(slug: string): string {
  return `/tarjouslaskuri/${slug}`;
}
