import { noIndexRobots } from "@/lib/seo";

/** Huolto-lomake vaatii kirjautumisen — ei hakukoneindeksiin. */
export const metadata = noIndexRobots;

export default function HuoltoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
