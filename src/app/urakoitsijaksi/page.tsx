import { redirect } from "next/navigation";

export default function ContractorLandingPage() {
  redirect("/rekisteroidy?rooli=urakoitsija");
}
