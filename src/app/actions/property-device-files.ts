"use server";

import { revalidatePath } from "next/cache";
import {
  deletePropertyDeviceFileRecord,
  uploadPropertyDeviceFilesFromFormData,
} from "@/lib/property-device-files";
import { createClient } from "@/lib/supabase/server";

export type PropertyDeviceFileActionState = { error?: string; ok?: string };

async function verifyDeviceOwnership(
  propertyId: string,
  deviceId: string,
  customerId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_devices")
    .select("id")
    .eq("id", deviceId)
    .eq("property_id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return !!data;
}

export async function uploadPropertyDeviceFiles(
  _prev: PropertyDeviceFileActionState,
  formData: FormData,
): Promise<PropertyDeviceFileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const deviceId = String(formData.get("device_id") ?? "");

  if (!propertyId || !deviceId) {
    return { error: "Puuttuva laite." };
  }

  if (!(await verifyDeviceOwnership(propertyId, deviceId, user.id))) {
    return { error: "Laitetta ei löydy." };
  }

  try {
    await uploadPropertyDeviceFilesFromFormData(
      propertyId,
      deviceId,
      user.id,
      formData,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Tiedoston lataus epäonnistui.";
    return { error: message };
  }

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Tiedosto tallennettu." };
}

export async function deletePropertyDeviceFile(
  _prev: PropertyDeviceFileActionState,
  formData: FormData,
): Promise<PropertyDeviceFileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const fileId = String(formData.get("file_id") ?? "");

  if (!propertyId || !fileId) return { error: "Puuttuva tiedosto." };

  const result = await deletePropertyDeviceFileRecord(fileId, user.id);
  if (!result.ok) return { error: result.error ?? "Poisto epäonnistui." };

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Tiedosto poistettu." };
}
