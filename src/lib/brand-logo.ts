import { readFileSync } from "fs";
import { join } from "path";

/** Julkinen polku selain-PDF:ille ja tulosteille. */
export const REMONTTIREITTI_LOGO_PATH = "/logo.svg";

let cachedSvgDataUri: string | null = null;

/** SVG data-URI PDF-generointiin (Node). */
export function remonttireittiLogoSvgDataUri(): string {
  if (!cachedSvgDataUri) {
    const svg = readFileSync(
      join(process.cwd(), "public/logo.svg"),
      "utf8",
    );
    cachedSvgDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
  return cachedSvgDataUri;
}
