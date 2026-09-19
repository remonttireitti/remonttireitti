import Link from "next/link";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { siteConfig } from "@/lib/site-config";

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;
  const profile = user ? await getProfile() : null;
  const isCustomer = !!user && !contractor && profile?.role === "customer";

  return (
    <footer className="mt-auto border-t border-stone-200 bg-white print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-semibold text-stone-900">{siteConfig.name}</p>
            <p className="mt-2 text-sm text-stone-600">
              Remontit, kunnossapito, huolto ja {marketplaceBrand.name.toLowerCase()}{" "}
              — yksi paikka kotiin liittyville tarpeille.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-900">Palvelu</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href="/palvelut#palvelut" className="text-stone-600 hover:text-sky-700">
                  Palvelut & kunnossapito
                </Link>
              </li>
              <li>
                <Link href="/palvelut" className="text-stone-600 hover:text-sky-700">
                  Kaikki palvelut
                </Link>
              </li>
              {!contractor && (
                <li>
                  <Link href="/remontti/uusi" className="text-stone-600 hover:text-sky-700">
                    Kilpailuta remontti
                  </Link>
                </li>
              )}
              <li>
                <Link href="/markkinapaikka" className="text-stone-600 hover:text-sky-700">
                  {marketplaceBrand.nameShort}
                </Link>
              </li>
              {!user && (
                <li>
                  <Link href="/urakoitsijaksi" className="text-stone-600 hover:text-sky-700">
                    Urakoitsijaksi
                  </Link>
                </li>
              )}
              {contractor && (
                <li>
                  <Link
                    href="/oma-tili/yritys"
                    className="text-stone-600 hover:text-sky-700"
                  >
                    Yritystiedot
                  </Link>
                </li>
              )}
              {isCustomer && (
                <li>
                  <Link href="/oma-tili" className="text-stone-600 hover:text-sky-700">
                    Oma tili
                  </Link>
                </li>
              )}
              <li>
                <Link href="/suosittelu" className="text-stone-600 hover:text-sky-700">
                  Suosittelubonus
                </Link>
              </li>
              <li>
                <Link href="/palaute" className="text-stone-600 hover:text-sky-700">
                  Anna palautetta
                </Link>
              </li>
              <li>
                <Link href="/hinta-arkisto" className="text-stone-600 hover:text-sky-700">
                  Hinta-arkisto
                </Link>
              </li>
              <li>
                <Link href="/laskurit" className="text-stone-600 hover:text-sky-700">
                  Remonttilaskurit
                </Link>
              </li>
              <li>
                <Link
                  href={contractor ? "/tarjoukset" : "/tarjouspyynnot"}
                  className="text-stone-600 hover:text-sky-700"
                >
                  {contractor ? "Tarjouspyynnöt" : "Avoimet pyynnöt"}
                </Link>
              </li>
              {!contractor && (
                <li>
                  <Link href="/tarjousarvio" className="text-stone-600 hover:text-sky-700">
                    Tarjousvahti
                  </Link>
                </li>
              )}
              <li>
                <a
                  href="/tarjouspyynnot/feed.xml"
                  className="text-stone-600 hover:text-sky-700"
                >
                  RSS-syöte
                </a>
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
              <li>
                <Link href="/llms.txt" className="text-stone-600 hover:text-sky-700">
                  llms.txt
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-stone-600 hover:text-sky-700">
                  Sitemap
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
          {(siteConfig.instagramUrl || siteConfig.facebookUrl) && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {siteConfig.instagramUrl && (
                <a
                  href={siteConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-700 hover:underline"
                >
                  Instagram
                </a>
              )}
              {siteConfig.facebookUrl && (
                <a
                  href={siteConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-700 hover:underline"
                >
                  Facebook
                </a>
              )}
            </p>
          )}
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
          <p className="mt-4 text-xs text-stone-600">
            © {year} {siteConfig.legalName}. Kaikki oikeudet pidätetään.
          </p>
        </div>
      </div>
    </footer>
  );
}
