"use server";

import { revalidatePath } from "next/cache";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { FloorPlanPin } from "@/lib/floor-plan-pins";
import type { HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type FloorPlanActionState = {
  error?: string;
  ok?: string;
};

function sanitizePin(raw: FloorPlanPin): FloorPlanPin | null {
  if (!raw?.id || typeof raw.id !== "string") return null;
  const left = Number(raw.left);
  const top = Number(raw.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;

  let action = raw.action;
  if (action?.type === "toggle" && typeof action.deviceId === "string") {
    action = { type: "toggle", deviceId: action.deviceId };
  } else if (action?.type === "navigate" && typeof action.href === "string") {
    action = { type: "navigate", href: action.href.trim() };
  } else if (action?.type === "open_link" && typeof action.href === "string") {
    action = { type: "open_link", href: action.href.trim() };
  } else {
    action = { type: "none" };
  }

  return {
    id: raw.id,
    label: typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "Piste",
    left: Math.max(0, Math.min(100, left)),
    top: Math.max(0, Math.min(100, top)),
    icon: raw.icon ?? "bulb",
    action,
    deviceId: typeof raw.deviceId === "string" ? raw.deviceId : null,
    showValue: raw.showValue !== false,
    hidden: raw.hidden === true,
  };
}

export async function saveFloorPlanPins(
  pins: FloorPlanPin[],
): Promise<FloorPlanActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) return { error: "Keskusyksikköä ei löydy." };

  const cleaned = pins.map(sanitizePin).filter((p): p is FloorPlanPin => p != null);
  const state = (hub.state as HubState) ?? {};

  const { error } = await supabase
    .from("hubs")
    .update({ state: { ...state, floor_plan_pins: cleaned } })
    .eq("id", hub.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath("/");
  revalidatePath("/laitteet/pohjakuva");
  return { ok: "Pohjakuva tallennettu." };
}
