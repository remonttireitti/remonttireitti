import type { Metadata } from "next";
import { SHOW_MARKETPLACE_IN_MARKETING } from "@/lib/marketing-focus";
import { noIndexRobots } from "@/lib/seo";

/** Tori piilotettu markkinoinnista — ei indeksoida ennen lanseerausta. */
export const metadata: Metadata = SHOW_MARKETPLACE_IN_MARKETING ? {} : noIndexRobots;

export default function MarkkinapaikkaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
