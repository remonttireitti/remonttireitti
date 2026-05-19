import { noIndexRobots } from "@/lib/seo";
import type { ReactNode } from "react";

export const metadata = noIndexRobots;

export default function TarjouksetLayout({ children }: { children: ReactNode }) {
  return children;
}
