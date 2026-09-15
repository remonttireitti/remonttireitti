import { AdDemoPlayer } from "@/components/marketing/ad-demo-player";
import {
  customerAdScenes,
  parseAdDemoFormat,
} from "@/lib/ad-demo-scenes";

export default async function CustomerAdDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ formaatti?: string; chrome?: string }>;
}) {
  const params = await searchParams;
  const format = parseAdDemoFormat(params.formaatti);
  const showChrome = params.chrome !== "0";

  return (
    <AdDemoPlayer
      scenes={customerAdScenes}
      format={format}
      showChrome={showChrome}
    />
  );
}
