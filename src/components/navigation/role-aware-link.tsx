"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useRoleNav } from "@/components/navigation/role-nav-context";
import { isCrossRoleNavigation } from "@/lib/role-nav-paths";

type LinkProps = ComponentProps<typeof Link>;

function hrefToTarget(href: LinkProps["href"]): string {
  if (typeof href === "string") return href;
  if (typeof href === "object" && href !== null) {
    const path = href.pathname ?? "";
    const query = href.search ?? "";
    const hash = href.hash ?? "";
    return `${path}${query}${hash}`;
  }
  return "";
}

export function RoleAwareLink({
  href,
  onClick,
  ...props
}: LinkProps) {
  const roleNav = useRoleNav();
  const target = hrefToTarget(href);

  const blocked = target
    ? isCrossRoleNavigation(target, {
        loggedIn: roleNav.loggedIn,
        isCustomer: roleNav.isCustomer,
        isContractor: roleNav.isContractor,
      })
    : false;

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          const audience = roleNav.isContractor ? "customer" : "contractor";
          roleNav.openGate({ audience, href: target });
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
