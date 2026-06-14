"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parsePropertyFormData,
  validatePropertyForm,
} from "@/lib/property-profile";
import { createClient } from "@/lib/supabase/server";

export type PropertyActionState = { error?: string; ok?: string };

function propertyPayload(input: ReturnType<typeof parsePropertyFormData>) {
  return {
    label: input.label || null,
    address_line: input.addressLine,
    postal_code: input.postalCode,
    municipality: input.municipality,
    property_type: input.propertyType,
    built_year: input.builtYear,
    floor_area_m2: input.floorAreaM2,
    notes: input.notes || null,
    details: input.details,
  };
}

async function requireCustomerId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/kirjaudu?redirect=/oma-tili/huoltokirja");
  return user.id;
}

export async function createProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const customerId = await requireCustomerId();
  const input = parsePropertyFormData(formData);
  const validationError = validatePropertyForm(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      ...propertyPayload(input),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Samalla osoitteella on jo kiinteistö huoltokirjassa." };
    }
    return { error: "Kiinteistön tallennus epäonnistui." };
  }

  revalidatePath("/oma-tili/huoltokirja");
  redirect(`/oma-tili/huoltokirja/${data.id}?luotu=1`);
}

export async function updateProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const customerId = await requireCustomerId();
  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) return { error: "Puuttuva kiinteistö." };

  const input = parsePropertyFormData(formData);
  const validationError = validatePropertyForm(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!existing) return { error: "Kiinteistöä ei löydy." };

  const { error } = await supabase
    .from("properties")
    .update(propertyPayload(input))
    .eq("id", propertyId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Samalla osoitteella on jo toinen kiinteistö." };
    }
    return { error: "Tallennus epäonnistui." };
  }

  revalidatePath("/oma-tili/huoltokirja");
  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Kiinteistön tiedot päivitetty." };
}

export async function deleteProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const customerId = await requireCustomerId();
  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) return { error: "Puuttuva kiinteistö." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("customer_id", customerId);

  if (error) return { error: "Poisto epäonnistui." };

  revalidatePath("/oma-tili/huoltokirja");
  redirect("/oma-tili/huoltokirja?poistettu=1");
}
