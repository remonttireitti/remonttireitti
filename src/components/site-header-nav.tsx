"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { NavLinkPendingContent } from "@/components/navigation/nav-link-pending";
import { RoleAwareLink } from "@/components/navigation/role-aware-link";
import { SignOutButton } from "@/components/navigation/sign-out-button";
import { SHOW_MARKETPLACE_IN_MARKETING } from "@/lib/marketing-focus";
import { marketplaceBrand } from "@/lib/marketplace-brand";

type NavProps = {
  loggedIn: boolean;
  isCustomer: boolean;
  isContractor: boolean;
  isAdmin: boolean;
  isEvaluator: boolean;
  unreadNotifications?: number;
  showTarjousvahti?: boolean;
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
  roleAware = false,
}: {
  href: string;
  children: React.ReactNode;
  roleAware?: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));

  const LinkComponent = roleAware ? RoleAwareLink : Link;

  return (
    <LinkComponent href={href} className={navLinkClass(active)}>
      <NavLinkPendingContent>{children}</NavLinkPendingContent>
    </LinkComponent>
  );
}

/** Työpöytänavigaatio — mobiilissa käytä SiteHeaderMobileNav */
export function SiteHeaderNav({
  loggedIn,
  isCustomer,
  isContractor,
  isAdmin,
  isEvaluator,
  unreadNotifications = 0,
  showTarjousvahti = false,
}: NavProps) {
  const ctaLabel = isCustomer
    ? "Kilpailuta remontti"
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
        <NavLinkPendingContent>
          {isContractor ? (
            <>
              <span className="hidden lg:inline">Avoimet tarjouspyynnöt</span>
              <span className="lg:hidden">Tarjouspyynnöt</span>
            </>
          ) : (
            ctaLabel
          )}
        </NavLinkPendingContent>
      </Link>
    ) : null;

  return (
    <div className="hidden items-center gap-1 md:flex">
      <nav className="flex items-center gap-0.5">
        {SHOW_MARKETPLACE_IN_MARKETING && (
          <NavItem href="/markkinapaikka">{marketplaceBrand.nameShort}</NavItem>
        )}
        {loggedIn ? (
          <>
            <NavItem href={isContractor ? "/tarjoukset#ilmoitukset" : "/#ilmoitukset"}>
              <span className="inline-flex items-center gap-1.5">
                Ilmoitukset
                {unreadNotifications > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </span>
            </NavItem>
            {isCustomer && <NavItem href="/oma-tili/huoltokirja">Huoltokirja</NavItem>}
            {isContractor && (
              <NavItem href="/oma-tili#yritystiedot">Yritystiedot</NavItem>
            )}
            <NavItem href="/oma-tili">Oma tili</NavItem>
            {isEvaluator && <NavItem href="/arvioija">Arvioija</NavItem>}
            {isAdmin && <NavItem href="/admin">Admin</NavItem>}
          </>
        ) : (
          <>
            {showTarjousvahti && (
              <NavItem href="/tarjousarvio" roleAware>
                Tarjousvahti
              </NavItem>
            )}
            <NavItem href="/tarjouspyynnot" roleAware>
              Tarjouspyynnöt
            </NavItem>
            <NavItem href="/kirjaudu">Kirjaudu</NavItem>
          </>
        )}
      </nav>
      <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
      <div className="flex items-center gap-2">
        {loggedIn ? (
          <>
            {ctaDesktop}
            <form action={signOut} className="inline-flex">
              <SignOutButton className={navLinkClass(false)} />
            </form>
          </>
        ) : (
          <>
            <RoleAwareLink href="/asiakkaalle" className={navLinkClass(false)}>
              <NavLinkPendingContent>Asiakkaalle</NavLinkPendingContent>
            </RoleAwareLink>
            <RoleAwareLink href="/remontti/uusi" className={navLinkClass(false)}>
              <NavLinkPendingContent>Kilpailuta</NavLinkPendingContent>
            </RoleAwareLink>
            <RoleAwareLink href="/urakoitsijaksi" className={ctaClass}>
              <NavLinkPendingContent>Urakoitsijalle</NavLinkPendingContent>
            </RoleAwareLink>
          </>
        )}
      </div>
    </div>
  );
}
