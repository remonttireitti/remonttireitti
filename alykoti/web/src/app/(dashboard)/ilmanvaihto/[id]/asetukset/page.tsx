import { redirect } from "next/navigation";

export default function VentilationSettingsRedirect() {
  redirect("/ilmanvaihto/asetukset");
}
