import { noIndexRobots } from "@/lib/seo";

export const metadata = noIndexRobots;

export default function EvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
