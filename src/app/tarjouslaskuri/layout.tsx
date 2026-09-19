import { noIndexRobots } from "@/lib/seo";

export const metadata = noIndexRobots;

export default function ContractorQuoteCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
