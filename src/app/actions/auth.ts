"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseJobTypeIds,
  parseRefrigerantLicense,
  parseWorkCapability,
  validateContractorQualifications,
} from "@/lib/contractor-qualifications";
import { saveContractorQualifications } from "@/lib/save-contractor-qualifications";
import { notifyAdminsNewRegistration } from "@/lib/admin-user-notify";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export type AuthState = {
  error?: string;
};

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "customer");
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!email || !password || password.length < 8) {
    return { error: "Sähköposti ja salasana (väh. 8 merkkiä) vaaditaan." };
  }

  if (role === "contractor" && !companyName) {
    return { error: "Urakoitsijana rekisteröityessä yrityksen nimi vaaditaan." };
  }

  if (role === "contractor") {
    const qualErr = validateContractorQualifications(formData);
    if (qualErr) return { error: qualErr };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${role === "contractor" ? "/tarjoukset" : "/oma-tili"}`,
      data: {
        full_name: fullName || null,
        role: role === "contractor" ? "contractor" : "customer",
        company_name: role === "contractor" ? companyName : null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !data.session) {
    redirect("/kirjaudu?vahvistus=1");
  }

  if (data.user && role === "contractor") {
    await supabase
      .from("profiles")
      .update({ role: "contractor" })
      .eq("id", data.user.id);

    const saveRes = await saveContractorQualifications({
      contractorId: data.user.id,
      companyName: companyName || "Yritys (täydennä profiilissa)",
      jobTypeIds: parseJobTypeIds(formData),
      refrigerantLicense: parseRefrigerantLicense(formData)!,
      electricalCapability: parseWorkCapability(
        formData,
        "electrical_capability",
      )!,
      lviCapability: parseWorkCapability(formData, "lvi_capability")!,
    });

    if (saveRes.error) {
      return { error: `Tilin luonti onnistui, mutta pätevyydet epäonnistuivat: ${saveRes.error}` };
    }

    await syncContractorAccount(data.user);

    void notifyAdminsNewRegistration({
      userId: data.user.id,
      role: "contractor",
      fullName: fullName || null,
      companyName,
      email,
    });

    redirect("/tarjoukset");
  }

  if (data.user) {
    void notifyAdminsNewRegistration({
      userId: data.user.id,
      role: "customer",
      fullName: fullName || null,
      email,
    });
  }

  redirect("/oma-tili");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/oma-tili");

  if (!email || !password) {
    return { error: "Täytä sähköposti ja salasana." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Kirjautuminen epäonnistui. Tarkista tiedot." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await syncContractorAccount(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const { data: contractorProfile } = await supabase
      .from("contractor_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const isContractorUser =
      profile?.role === "contractor" || !!contractorProfile;

    if (isContractorUser && redirectTo === "/oma-tili") {
      redirect("/tarjoukset");
    }

    if (isContractorUser && redirectTo.startsWith("/tarjoukset")) {
      redirect(redirectTo);
    }
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/oma-tili");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
