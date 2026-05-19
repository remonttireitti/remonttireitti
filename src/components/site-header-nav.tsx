"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { marketplaceBrand } from "@/lib/marketplace-brand";

type NavProps = {
  loggedIn: boolean;
  isCustomer: boolean;
  isContractor: boolean;
  isAdmin: boolean;
  unreadNotifications?: number;
};

const linkBase =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors visited:text-slate-600";

function navLinkClass(active: boolean) {
  return active
    ? `${linkBase} bg-sky-100 text-sky-900`
    : `${linkBase} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

const ctaClass =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:from-orange-600 hover:to-orange-700";

function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));

  return <Link href={href} className={navLinkClass(active)}>{children}</Link>;
}

/** Työpöytänavigaatio — mobiilissa käytä SiteHeaderMobileNav */
export function SiteHeaderNav({
  loggedIn,
  isCustomer,
  isContractor,
  isAdmin,
  unreadNotifications = 0,
}: NavProps) {
  const ctaLabel = isCustomer
    ? "Kilpailuta lämpöpumppu"
    : isContractor
      ? "Tarjouspyynnöt"
      : null;

  const ctaHref = isCustomer
    ? "/remontti/uusi"
    : isContractor
      ? "/tarjoukset"
      : null;

  const ctaDesktop =
    ctaHref && ctaLabel ? (
      <Link href={ctaHref} className={ctaClass}>
        {isContractor ? (
          <>
            <span className="hidden lg:inline">Avoimet tarjouspyynnöt</span>
            <span className="lg:hidden">Tarjouspyynnöt</span>
          </>
        ) : (
          ctaLabel
        )}
      </Link>
    ) : null;

  return (
    <div className="hidden items-center gap-1 md:flex">
      <nav className="flex items-center gap-0.5">
        <NavItem href="/markkinapaikka">{marketplaceBrand.nameShort}</NavItem>
        {loggedIn ? (
          <>
            <NavItem href="/#ilmoitukset">
              <span className="inline-flex items-center gap-1.5">
                Ilmoitukset
                {unreadNotifications > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </span>
            </NavItem>
            <NavItem href="/oma-tili">Oma tili</NavItem>
            {isAdmin && <NavItem href="/admin">Admin</NavItem>}
          </>
        ) : (
          <NavItem href="/kirjaudu">Kirjaudu</NavItem>
        )}
      </nav>
      <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
      <div className="flex items-center gap-0.5">
        {loggedIn ? (
          <>
            {ctaDesktop}
            <form action={signOut} className="inline-flex">
              <button type="submit" className={navLinkClass(false)}>
                Kirjaudu ulos
              </button>
            </form>
          </>
        ) : (
          <Link href="/rekisteroidy" className={ctaClass}>
            Luo tili
          </Link>
        )}
      </div>
    </div>
  );
}
