import { noIndexRobots } from "@/lib/seo";
import type { ReactNode } from "react";

export const metadata = noIndexRobots;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
