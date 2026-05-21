export const profileRoleLabels = {
  customer: "Asiakas",
  contractor: "Urakoitsija",
  admin: "Ylläpitäjä",
} as const;

export type ProfileRole = keyof typeof profileRoleLabels;

export function getProfileRoleLabel(role: string): string {
  if (role in profileRoleLabels) {
    return profileRoleLabels[role as ProfileRole];
  }
  return role;
}

export function profileRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-violet-100 text-violet-800 ring-1 ring-violet-200";
    case "contractor":
      return "bg-sky-100 text-sky-900 ring-1 ring-sky-200";
    case "customer":
      return "bg-stone-100 text-stone-700 ring-1 ring-stone-200";
    default:
      return "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
  }
}
