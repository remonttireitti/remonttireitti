import Link from "next/link";
import { brand } from "@/lib/brand-theme";

type GuestMessagingNoticeProps = {
  variant?: "info" | "compact";
  guestEmail?: string | null;
  projectId?: string;
};

/** Ilmoitus: ilman tiliä ei voi viestitellä urakoitsijoiden kanssa sovelluksessa. */
export function GuestMessagingNotice({
  variant = "info",
  guestEmail,
  projectId,
}: GuestMessagingNoticeProps) {
  const registerHref =
    guestEmail && projectId
      ? `/rekisteroidy?email=${encodeURIComponent(guestEmail)}&redirect=${encodeURIComponent(`/remontti/${projectId}`)}`
      : "/rekisteroidy?redirect=/remontti/uusi";

  if (variant === "compact") {
    return (
      <p className="text-sm text-stone-600">
        Ilman tiliä et voi viestitellä urakoitsijoiden kanssa — tarjoukset ja
        ilmoitukset tulevat sähköpostiin.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Viestittely vaatii tilin</p>
      <p className="mt-1 leading-relaxed">
        Ilman tiliä näet tarjoukset henkilökohtaisesta linkistä, mutta et voi
        keskustella urakoitsijoiden kanssa sovelluksessa ennen tarjouksen valintaa.
        Voit luoda tilin myöhemmin — tai jatkaa pelkällä sähköpostilinkillä.
      </p>
      {guestEmail && projectId && (
        <Link href={registerHref} className={`${brand.link} mt-2 inline-block text-sm font-semibold`}>
          Luo tili ja ota viestittely käyttöön →
        </Link>
      )}
    </section>
  );
}
