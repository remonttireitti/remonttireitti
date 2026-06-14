import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformFeedbackPanel } from "@/components/feedback/platform-feedback-panel";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";

export default async function PlatformFeedbackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/oma-tili/palaute");

  const profile = await getProfile();
  const contractor = profile?.role === "contractor" || (await isContractor());

  if (!profile || (profile.role !== "customer" && profile.role !== "contractor" && !contractor)) {
    redirect("/oma-tili");
  }

  const role = contractor ? "contractor" : "customer";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link href="/oma-tili" className="text-sm text-sky-800 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Palaute palvelusta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Arvioi Remonttivalitys-palvelun selkeyttä ja käyttömukavuutta. Voit
          antaa palautetta useita kertoja — erityisesti urakan jälkeen näytämme
          erillisen kyselyn urakkasivulla.
        </p>

        <div className="mt-8">
          <PlatformFeedbackPanel role={role} existing={null} />
        </div>
      </main>
    </div>
  );
}
