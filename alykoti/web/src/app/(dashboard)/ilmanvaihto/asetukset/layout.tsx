import { SettingsSubNav } from "@/components/settings-sub-nav";

export default function IlmanvaihtoAsetuksetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl gap-8">
      <aside className="hidden w-44 shrink-0 md:block">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          Asetukset
        </p>
        <SettingsSubNav />
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-4 -mx-4 overflow-x-auto px-4 scroll-tabs md:mx-0 md:mb-6 md:hidden md:px-0">
          <SettingsSubNav horizontal />
        </div>
        {children}
      </div>
    </div>
  );
}
