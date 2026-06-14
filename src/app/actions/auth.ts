"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseElectricalQualification,
  parseJobTypeIds,
  parseLviQualifications,
  parseRefrigerantLicense,
  parseTradeIds,
  validateContractorQualifications,
} from "@/lib/contractor-qualifications";
import { saveContractorQualifications } from "@/lib/save-contractor-qualifications";
import { notifyAdminsNewRegistration } from "@/lib/admin-user-notify";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export type AuthState = {
  error?: string;
  success?: string;
};

export type PasswordResetRequestState = {
  error?: string;
  success?: string;
};

export type UpdatePasswordState = {
  error?: string;
  success?: string;
};

const MIN_PASSWORD_LENGTH = 8;

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

  if (!email || !password || password.length < MIN_PASSWORD_LENGTH) {
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
      tradeIds: parseTradeIds(formData),
      jobTypeIds: parseJobTypeIds(formData),
      refrigerantLicense: parseRefrigerantLicense(formData),
      electricalQualification: parseElectricalQualification(formData),
      lviQualifications: parseLviQualifications(formData),
    });

    if (saveRes.error) {
      return { error: `Tilin luonti onnistui, mutta pätevyydet epäonnistuivat: ${saveRes.error}` };
    }

    await syncContractorAccount(data.user);

    await notifyAdminsNewRegistration({
      userId: data.user.id,
      role: "contractor",
      fullName: fullName || null,
      companyName,
      email,
    });

    redirect("/tarjoukset");
  }

  if (data.user) {
    await notifyAdminsNewRegistration({
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

/** Lähettää salasanan palautuslinkin sähköpostiin (Supabase Auth). */
export async function requestPasswordReset(
  _prev: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Anna sähköpostiosoite." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = encodeURIComponent("/salasana/uusi");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${next}`,
  });

  if (error) {
    console.error("[requestPasswordReset]", error.message);
    return {
      error: "Palautuslinkin lähetys epäonnistui. Yritä hetken kuluttua uudelleen.",
    };
  }

  return {
    success:
      "Jos osoite löytyy palvelusta, lähetimme siihen linkin salasanan vaihtoon. Tarkista myös roskaposti.",
  };
}

/** Asettaa uuden salasanan palautuslinkin jälkeen (vaatii aktiivisen session). */
export async function updatePasswordAfterRecovery(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Salasanan pitää olla vähintään ${MIN_PASSWORD_LENGTH} merkkiä.` };
  }

  if (password !== passwordConfirm) {
    return { error: "Salasanat eivät täsmää." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Istunto vanhentunut. Pyydä uusi palautuslinkki sähköpostiisi.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[updatePasswordAfterRecovery]", error.message);
    return { error: "Salasanan vaihto epäonnistui. Yritä uudelleen." };
  }

  redirect("/kirjaudu?salasana=1");
}
