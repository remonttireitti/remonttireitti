import { noIndexRobots } from "@/lib/seo";
import type { ReactNode } from "react";

export const metadata = noIndexRobots;

export default function RemonttiLayout({ children }: { children: ReactNode }) {
  return children;
}
