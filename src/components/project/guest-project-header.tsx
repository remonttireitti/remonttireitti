import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Minimal header for guest project links — no admin/contractor nav bleed-through. */
export function GuestProjectHeader({
  guestEmail,
  loggedInRole,
}: {
  guestEmail?: string | null;
  loggedInRole?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 shadow-sm ring-1 ring-sky-100 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Logo href="/" size="sm" compactOnMobile />
            <p className="text-xs font-medium text-sky-950 sm:text-sm">
              Henkilökohtainen linkki
              {guestEmail ? (
                <span className="hidden font-normal text-sky-800 sm:inline">
                  {" "}
                  · {guestEmail}
                </span>
              ) : null}
            </p>
          </div>
          {loggedInRole && (
            <p className="mt-2 text-xs leading-relaxed text-amber-950">
              Selaimessasi on aktiivinen{" "}
              <span className="font-semibold">{loggedInRole}</span>
              -istunto. Tämä sivu näyttää asiakkaan tarjouspyynnön vieraslinkin
              kautta — et admin- tai urakoitsijanäkymää.{" "}
              <Link href="/kirjaudu" className="font-medium underline">
                Kirjaudu ulos
              </Link>{" "}
              jos haluat testata rooleja erikseen.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
