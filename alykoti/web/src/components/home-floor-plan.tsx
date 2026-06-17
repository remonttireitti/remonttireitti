"use client";

import Link from "next/link";
import { FloorPlanView } from "@/components/floor-plan-view";
import type { Hub } from "@/lib/types";

type Props = {
  hub: Hub | null;
  settingsHref?: string;
};

export function HomeFloorPlan({ hub, settingsHref = "/ilmanvaihto/asetukset" }: Props) {
  return (
    <FloorPlanView
      title="Koti"
      markers={[]}
      headerRight={
        hub ? (
          <Link
            href={settingsHref}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Asetukset
          </Link>
        ) : undefined
      }
    />
  );
}
