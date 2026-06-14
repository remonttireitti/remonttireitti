"use server";

import { revalidatePath } from "next/cache";
import {
  componentPayload,
  parsePropertyComponentFormData,
  validatePropertyComponentForm,
} from "@/lib/property-components";
import { createClient } from "@/lib/supabase/server";

export type PropertyComponentActionState = { error?: string; ok?: string };

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

export async function savePropertyComponent(
  _prev: PropertyComponentActionState,
  formData: FormData,
): Promise<PropertyComponentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const componentId = String(formData.get("component_id") ?? "").trim();

  if (!propertyId) return { error: "Puuttuva kiinteistö." };
  if (!(await verifyPropertyOwnership(propertyId, user.id))) {
    return { error: "Kiinteistöä ei löydy." };
  }

  const input = parsePropertyComponentFormData(formData);
  const validationError = validatePropertyComponentForm(input);
  if (validationError) return { error: validationError };

  const payload = {
    ...componentPayload(input),
    property_id: propertyId,
    customer_id: user.id,
  };

  if (componentId) {
    const { data: existing } = await supabase
      .from("property_components")
      .select("id")
      .eq("id", componentId)
      .eq("property_id", propertyId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (!existing) return { error: "Rakennusosaa ei löydy." };

    const { error } = await supabase
      .from("property_components")
      .update(payload)
      .eq("id", componentId);

    if (error) return { error: "Tallennus epäonnistui." };
  } else {
    const { error } = await supabase.from("property_components").insert(payload);
    if (error) return { error: "Lisäys epäonnistui." };
  }

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return {
    ok: componentId ? "Rakennusosa päivitetty." : "Rakennusosa lisätty.",
  };
}

export async function deletePropertyComponent(
  _prev: PropertyComponentActionState,
  formData: FormData,
): Promise<PropertyComponentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const propertyId = String(formData.get("property_id") ?? "");
  const componentId = String(formData.get("component_id") ?? "");

  if (!propertyId || !componentId) return { error: "Puuttuva rakennusosa." };

  const { error } = await supabase
    .from("property_components")
    .delete()
    .eq("id", componentId)
    .eq("property_id", propertyId)
    .eq("customer_id", user.id);

  if (error) return { error: "Poisto epäonnistui." };

  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Rakennusosa poistettu." };
}
