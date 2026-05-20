import { redirect } from "next/navigation";

/** Vanha polku → yhdistetty laskutusnäkymä */
export default function AdminMarketplaceRedirect() {
  redirect("/admin/laskutus#tori");
}
