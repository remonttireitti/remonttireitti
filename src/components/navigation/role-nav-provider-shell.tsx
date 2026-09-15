import { RoleNavGateDialog } from "@/components/navigation/role-nav-gate-dialog";
import { RoleNavProvider } from "@/components/navigation/role-nav-context";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import type { ReactNode } from "react";

export async function RoleNavProviderShell({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const contractor = user ? await isContractor() : false;

  return (
    <RoleNavProvider
      loggedIn={!!user}
      isCustomer={!!user && !contractor && profile?.role === "customer"}
      isContractor={contractor}
    >
      {children}
      <RoleNavGateDialog />
    </RoleNavProvider>
  );
}
