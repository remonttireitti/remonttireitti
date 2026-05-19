import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-semibold text-stone-900">{siteConfig.name}</p>
            <p className="mt-2 text-sm text-stone-600">
              Lämpöpumppujen tarjouskilpailu ja markkinapaikka.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">Palvelu</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href="/remontti/uusi" className="text-stone-600 hover:text-sky-700">
                  Kilpailuta lämpöpumppu
                </Link>
              </li>
              <li>
                <Link href="/markkinapaikka" className="text-stone-600 hover:text-sky-700">
                  Markkinapaikka
                </Link>
              </li>
              <li>
                <Link href="/urakoitsijaksi" className="text-stone-600 hover:text-sky-700">
                  Urakoitsijaksi
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">Tiedot</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href="/tietosuoja" className="text-stone-600 hover:text-sky-700">
                  Tietosuojaseloste
                </Link>
              </li>
              <li>
                <Link href="/kayttoehdot" className="text-stone-600 hover:text-sky-700">
                  Käyttöehdot
                </Link>
              </li>
              <li>
                <Link href="/tietosuoja#evasteet" className="text-stone-600 hover:text-sky-700">
                  Evästeet
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-6 text-sm text-stone-600">
          <p className="font-medium text-stone-800">{siteConfig.legalName}</p>
          {siteConfig.businessId && (
            <p className="mt-1">Y-tunnus: {siteConfig.businessId}</p>
          )}
          {siteConfig.address && <p className="mt-1">{siteConfig.address}</p>}
          <p className="mt-2">
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-sky-700 hover:underline"
            >
              {siteConfig.email}
            </a>
            {siteConfig.phone && (
              <>
                {" · "}
                <a
                  href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                  className="text-sky-700 hover:underline"
                >
                  {siteConfig.phone}
                </a>
              </>
            )}
          </p>
          <p className="mt-4 text-xs text-stone-500">
            © {year} {siteConfig.legalName}. Kaikki oikeudet pidätetään.
          </p>
        </div>
      </div>
    </footer>
  );
}
