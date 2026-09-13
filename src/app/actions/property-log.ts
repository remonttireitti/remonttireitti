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

function parseLogEntryForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const performedAt = String(formData.get("performed_at") ?? "").trim();
  const contractorName = String(formData.get("contractor_name") ?? "").trim();
  const amountEuros = String(formData.get("amount_euros") ?? "").trim();
  return { title, description, performedAt, contractorName, amountEuros };
}

function validateLogEntry(input: ReturnType<typeof parseLogEntryForm>): string | null {
  if (input.title.length < 3) return "Otsikko on liian lyhyt.";
  if (!input.performedAt) return "Anna suorituspäivä.";
  if (Number.isNaN(Date.parse(input.performedAt))) return "Päivämäärä on virheellinen.";
  if (input.amountEuros && Number(input.amountEuros) <= 0) {
    return "Hinta pitää olla positiivinen.";
  }
  return null;
}

export async function createLogEntry(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const customerId = await requireCustomerId();
  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) return { error: "Puuttuva kiinteistö." };

  const input = parseLogEntryForm(formData);
  const validationError = validateLogEntry(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!property) return { error: "Kiinteistöä ei löydy." };

  const amountCents = input.amountEuros
    ? Math.round(Number(input.amountEuros) * 100)
    : null;

  const { error } = await supabase.from("property_log_entries").insert({
    property_id: propertyId,
    customer_id: customerId,
    source: "manual",
    title: input.title,
    description: input.description || null,
    performed_at: input.performedAt,
    contractor_name: input.contractorName || null,
    amount_cents: amountCents,
  });

  if (error) return { error: "Merkinnän tallennus epäonnistui." };

  revalidatePath("/oma-tili/huoltokirja");
  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Työmerkintä lisätty huoltokirjaan." };
}

export async function deleteLogEntry(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const customerId = await requireCustomerId();
  const entryId = String(formData.get("entry_id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");
  if (!entryId || !propertyId) return { error: "Puuttuva merkintä." };

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("property_log_entries")
    .select("id, source, project_id")
    .eq("id", entryId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!entry) return { error: "Merkintää ei löydy." };
  if (entry.source === "platform" || entry.project_id) {
    return { error: "Urakasta syntynyttä merkintää ei voi poistaa." };
  }

  const { error } = await supabase
    .from("property_log_entries")
    .delete()
    .eq("id", entryId);

  if (error) return { error: "Poisto epäonnistui." };

  revalidatePath("/oma-tili/huoltokirja");
  revalidatePath(`/oma-tili/huoltokirja/${propertyId}`);
  return { ok: "Merkintä poistettu." };
}
