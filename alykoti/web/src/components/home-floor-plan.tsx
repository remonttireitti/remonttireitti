"use client";

import { FloorPlanView } from "@/components/floor-plan-view";
import type { Hub } from "@/lib/types";

type Props = {
  hub: Hub | null;
};

export function HomeFloorPlan({ hub }: Props) {
  void hub;
  return <FloorPlanView markers={[]} hideHeader />;
}
