import { redirect } from "next/navigation";

/** Vanha URL → uusi slug */
export default function LegacyBathroomCalculatorRedirect() {
  redirect("/laskurit/kylpyhuone");
}
