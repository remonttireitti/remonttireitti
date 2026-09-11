import { noIndexRobots } from "@/lib/seo";

export const metadata = noIndexRobots;

export default function PlatformSubscriptionOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
