import { CommandStatusProvider } from "@/components/command-status-provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <CommandStatusProvider>
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
        </div>
      </CommandStatusProvider>
    </SidebarProvider>
  );
}
