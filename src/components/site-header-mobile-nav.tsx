"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { NavLinkPendingContent } from "@/components/navigation/nav-link-pending";
import { SignOutButton } from "@/components/navigation/sign-out-button";
import { marketplaceBrand } from "@/lib/marketplace-brand";

type Props = {
  loggedIn: boolean;
  isCustomer: boolean;
  isContractor: boolean;
  isAdmin: boolean;
  unreadNotifications?: number;
};

const chipBase =
  "inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors";

function chipClass(active: boolean) {
  return active
    ? `${chipBase} bg-sky-100 text-sky-900`
    : `${chipBase} text-stone-700 hover:bg-stone-100`;
}

const ctaChip =
  "inline-flex shrink-0 items-center rounded-lg bg-orange-700 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-800";

function NavChip({
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
    <Link href={href} className={chipClass(active)} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function SiteHeaderMobileNav({
  loggedIn,
  isCustomer,
  isContractor,
  isAdmin,
  unreadNotifications = 0,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const ctaHref = isCustomer
    ? "/remontti/uusi"
    : isContractor
      ? "/tarjoukset"
      : null;

  const ctaLabel = isCustomer
    ? "Kilpailuta remontti"
    : isContractor
      ? "Tarjouspyynnöt"
      : null;

  const ctaLabelShort = isCustomer ? "Kilpailuta" : isContractor ? "Tarjouspyynnöt" : null;

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const closeMore = () => setMoreOpen(false);


  return (
    <div className="mt-2 space-y-2 md:hidden">
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="flex w-full items-center justify-center rounded-xl bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800"
        >
          <NavLinkPendingContent>
            <span className="sm:hidden">{ctaLabelShort}</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
          </NavLinkPendingContent>
        </Link>
      )}

      <div className="flex items-center gap-1 rounded-xl border border-stone-200/80 bg-white/90 px-2 py-1.5 shadow-sm ring-1 ring-stone-200/50">
        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Pikavalikko"
        >
          <NavChip href="/markkinapaikka">{marketplaceBrand.nameShort}</NavChip>

          {loggedIn ? (
            <>
              <NavChip href="/#ilmoitukset">
                <span className="inline-flex items-center gap-1.5">
                  Ilmoitukset
                  {unreadNotifications > 0 && (
                    <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-orange-700 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </span>
              </NavChip>
              {isCustomer && (
                <NavChip href="/oma-tili/huoltokirja">Huoltokirja</NavChip>
              )}
              <NavChip href="/oma-tili">Oma tili</NavChip>
            </>
          ) : (
            <>
              <NavChip href="/urakoitsijaksi" onNavigate={closeMore}>
                Urakoitsijalle
              </NavChip>
              <NavChip href="/kirjaudu">Kirjaudu</NavChip>
              <Link href="/rekisteroidy?rooli=urakoitsija" className={ctaChip}>
                <NavLinkPendingContent>Rekisteröidy</NavLinkPendingContent>
              </Link>
            </>
          )}
        </nav>

        {loggedIn && (
          <div ref={moreRef} className="relative shrink-0 border-l border-stone-100 pl-1">
            <button
              type="button"
              className={`${chipBase} px-2.5 text-stone-600`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Lisää toimintoja"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span aria-hidden>···</span>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
              >
                {isAdmin && (
                  <Link
                    href="/admin"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-50"
                    onClick={closeMore}
                  >
                    <NavLinkPendingContent>Admin</NavLinkPendingContent>
                  </Link>
                )}
                <form action={signOut}>
                  <SignOutButton className="block w-full px-4 py-2.5 text-left text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-60" />
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
