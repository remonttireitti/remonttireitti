"use server";

import { revalidatePath } from "next/cache";
import {
  devicePayload,
  parsePropertyDeviceFormData,
  validatePropertyDeviceForm,
} from "@/lib/property-devices";
import { createClient } from "@/lib/supabase/server";

export type PropertyDeviceActionState = { error?: string; ok?: string };

async function verifyPropertyOwnership(
  propertyId: string,
  customerId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return !!data;
}

export async function savePropertyDevice(
  _prev: PropertyDeviceActionState,
  formData: FormData,
): Promise<PropertyDeviceActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const deviceId = String(formData.get("device_id") ?? "").trim();

  if (!propertyId) return { error: "Puuttuva kiinteistö." };

  if (!(await verifyPropertyOwnership(propertyId, user.id))) {
    return { error: "Kiinteistöä ei löydy." };
  }

  const input = parsePropertyDeviceFormData(formData);
  const validationError = validatePropertyDeviceForm(input);
  if (validationError) return { error: validationError };

  const payload = {
    ...devicePayload(input),
    property_id: propertyId,
    customer_id: user.id,
  };

  if (deviceId) {
    const { data: existing } = await supabase
      .from("property_devices")
      .select("id")
      .eq("id", deviceId)
      .eq("property_id", propertyId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (!existing) return { error: "Laitetta ei löydy." };

    const { error } = await supabase
      .from("property_devices")
      .update(payload)
      .eq("id", deviceId);

    if (error) return { error: "Tallennus epäonnistui." };
  } else {
    const { error } = await supabase.from("property_devices").insert(payload);
    if (error) return { error: "Lisäys epäonnistui." };
  }

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  revalidatePath("/oma-tili/huoltokirja");
  return { ok: deviceId ? "Laite päivitetty." : "Laite lisätty." };
}

export async function deletePropertyDevice(
  _prev: PropertyDeviceActionState,
  formData: FormData,
): Promise<PropertyDeviceActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const deviceId = String(formData.get("device_id") ?? "");

  if (!propertyId || !deviceId) return { error: "Puuttuva laite." };

  const { error } = await supabase
    .from("property_devices")
    .delete()
    .eq("id", deviceId)
    .eq("property_id", propertyId)
    .eq("customer_id", user.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  revalidatePath("/oma-tili/huoltokirja");
  return { ok: "Laite poistettu." };
}
