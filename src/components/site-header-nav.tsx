"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  "inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:from-orange-600 hover:to-orange-700";

function NavItem({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));

  return (
    <Link href={href} className={navLinkClass(active)} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function SiteHeaderNav({
  loggedIn,
  isCustomer,
  isContractor,
  isAdmin,
  unreadNotifications = 0,
}: NavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const cta = isCustomer ? (
    <Link href="/remontti/uusi" className={ctaClass} onClick={close}>
      Kilpailuta lämpöpumppu
    </Link>
  ) : isContractor ? (
    <Link href="/tarjoukset" className={ctaClass} onClick={close}>
      <span className="hidden lg:inline">Avoimet tarjouspyynnöt</span>
      <span className="lg:hidden">Tarjouspyynnöt</span>
    </Link>
  ) : null;

  const navLinks = (
    <>
      <NavItem href="/markkinapaikka" onNavigate={close}>
        {marketplaceBrand.nameShort}
      </NavItem>
      {loggedIn ? (
        <>
          <NavItem href="/#ilmoitukset" onNavigate={close}>
            <span className="inline-flex items-center gap-1.5">
              Ilmoitukset
              {unreadNotifications > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </span>
          </NavItem>
          <NavItem href="/oma-tili" onNavigate={close}>
            Oma tili
          </NavItem>
          {isAdmin && (
            <NavItem href="/admin" onNavigate={close}>
              Admin
            </NavItem>
          )}
        </>
      ) : (
        <NavItem href="/kirjaudu" onNavigate={close}>
          Kirjaudu
        </NavItem>
      )}
    </>
  );

  const accountActions = loggedIn ? (
    <>
      {cta}
      <form action={signOut} className="inline-flex">
        <button type="submit" className={navLinkClass(false)}>
          Kirjaudu ulos
        </button>
      </form>
    </>
  ) : (
    <Link href="/rekisteroidy" className={ctaClass} onClick={close}>
      Luo tili
    </Link>
  );

  return (
    <>
      <div className="hidden items-center gap-1 md:flex">
        <nav className="flex items-center gap-0.5">{navLinks}</nav>
        <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden />
        <div className="flex items-center gap-0.5">
          {accountActions}
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        {cta}
        <button
          type="button"
          className={navLinkClass(false)}
          aria-expanded={open}
          aria-label={open ? "Sulje valikko" : "Avaa valikko"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            {open ? (
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute inset-x-3 top-full z-50 mt-2 rounded-2xl border border-stone-200/90 bg-white p-2 shadow-xl md:hidden"
          role="dialog"
        >
          <nav className="flex flex-col gap-0.5">{navLinks}</nav>
          <div className="my-2 h-px bg-stone-100" />
          <div className="flex flex-col gap-0.5">{accountActions}</div>
        </div>
      )}
    </>
  );
}
