import { CommandStatusProvider } from "@/components/command-status-provider";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { MobileTopBar } from "@/components/dashboard/mobile-top-bar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <CommandStatusProvider>
        <div className="flex min-h-[100dvh] flex-col md:flex-row">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar />
            <main className="min-w-0 flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-6 md:pb-6">
              {children}
            </main>
          </div>
          <MobileBottomNav />
        </div>
      </CommandStatusProvider>
    </SidebarProvider>
  );
}
