import { noIndexRobots } from "@/lib/seo";
import type { ReactNode } from "react";

export const metadata = noIndexRobots;

export default function OmaTiliLayout({ children }: { children: ReactNode }) {
  return children;
}
