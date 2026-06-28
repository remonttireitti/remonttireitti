import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { isLocalMode } from "@/lib/local-mode";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isLocalMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
