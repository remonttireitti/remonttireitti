import { DashboardSidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-stone-600">
              Kirjaudu ulos
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
