"use client";

import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { setAdminPreviewMode } from "@/app/actions/admin-preview";
import type { AdminPreviewMode } from "@/lib/admin-preview";

function ModeButton({
  mode,
  label,
  active,
}: {
  mode: AdminPreviewMode | "off";
  label: string;
  active: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-violet-700 text-white"
          : "bg-white/90 text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminPreviewBar({
  activeMode,
}: {
  activeMode: AdminPreviewMode | null;
}) {
  const pathname = usePathname();

  return (
    <div className="border-b border-violet-200 bg-violet-50/95 px-3 py-2 text-sm text-violet-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Admin-esikatselu</p>
          <p className="text-xs text-violet-800/90">
            {activeMode
              ? `Selataan ${activeMode === "customer" ? "asiakkaana" : "urakoitsijana"}. Testipyynnöt ja -tarjoukset eivät näy muille eivätkä lähetä ilmoituksia.`
              : "Valitse rooli kokeillaksesi palvelua oikealla käyttöliittymällä."}
          </p>
        </div>
        <form action={setAdminPreviewMode} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="redirect" value={pathname || "/"} />
          <ModeButton
            mode="customer"
            label="Selaa asiakkaana"
            active={activeMode === "customer"}
          />
          <ModeButton
            mode="contractor"
            label="Selaa urakoitsijana"
            active={activeMode === "contractor"}
          />
          <ModeButton
            mode="off"
            label="Poistu esikatselusta"
            active={activeMode === null}
          />
        </form>
      </div>
    </div>
  );
}
