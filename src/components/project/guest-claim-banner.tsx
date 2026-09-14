import Link from "next/link";
import { brand } from "@/lib/brand-theme";

export function GuestClaimBanner({
  guestEmail,
  projectId,
}: {
  guestEmail: string;
  projectId: string;
}) {
  const registerHref = `/rekisteroidy?email=${encodeURIComponent(guestEmail)}&redirect=${encodeURIComponent(`/remontti/${projectId}`)}`;

  return (
    <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
      <h2 className="font-semibold text-sky-950">
        Haluatko säilyttää tarjouspyyntösi, huoltokirjan ja remonttihistorian yhdessä paikassa?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sky-900">
        Voit jatkaa sähköpostilinkillä — tai luo tunnus myöhemmin, kun olet jo saanut
        kokemuksen palvelusta.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-sky-900">
        Ilman tiliä et voi viestitellä urakoitsijoiden kanssa sovelluksessa. Tilin luonnin
        jälkeen voit keskustella urakoitsijoiden kanssa ennen tarjouksen valintaa.
      </p>
      <Link href={registerHref} className={`${brand.btnSecondary} mt-4 inline-flex text-sm`}>
        Luo tunnus ({guestEmail})
      </Link>
    </section>
  );
}
