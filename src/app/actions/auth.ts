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
import { validateCompanyFactsForm } from "@/lib/contractor-company-facts";
import { resolveContractorTradeIdsFromForm } from "@/lib/resolve-contractor-trades";
import { saveContractorQualifications } from "@/lib/save-contractor-qualifications";
import { notifyAdminsNewRegistration } from "@/lib/admin-user-notify";
import {
  isValidReferrerEmail,
  normalizeReferrerEmail,
} from "@/lib/contractor-referral";
import {
  lookupCustomerIdByEmail,
  referrerExistsForContractorSignup,
} from "@/lib/customer-referral";
import { contractorHomePath } from "@/lib/contractor-paths";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { syncUserReferrals } from "@/lib/sync-user-referrals";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export type AuthState = {
  error?: string;
  success?: string;
  redirectPath?: string;
};

export type PasswordResetRequestState = {
  error?: string;
  success?: string;
};

export type UpdatePasswordState = {
  error?: string;
  success?: string;
  redirectPath?: string;
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
  const referrerEmailRaw = String(formData.get("referrer_email") ?? "").trim();
  const customerReferrerEmailRaw = String(
    formData.get("customer_referrer_email") ?? "",
  ).trim();

  if (!email || !password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: "Sähköposti ja salasana (väh. 8 merkkiä) vaaditaan." };
  }

  if (role === "contractor" && !companyName) {
    return { error: "Urakoitsijana rekisteröityessä yrityksen nimi vaaditaan." };
  }

  let contractorFacts: ReturnType<typeof validateCompanyFactsForm> | null = null;
  if (role === "contractor") {
    if (!referrerEmailRaw) {
      return { error: "Anna suosittelijan sähköpostiosoite." };
    }
    if (!isValidReferrerEmail(referrerEmailRaw)) {
      return { error: "Anna kelvollinen suosittelijan sähköpostiosoite." };
    }
    if (normalizeReferrerEmail(referrerEmailRaw) === normalizeReferrerEmail(email)) {
      return { error: "Et voi suosittaa itseäsi." };
    }

    const admin = tryCreateAdminClient();
    if (!admin) {
      return { error: "Rekisteröityminen ei onnistu juuri nyt. Yritä myöhemmin." };
    }
    const referrerExists = await referrerExistsForContractorSignup(
      admin,
      referrerEmailRaw,
    );
    if (!referrerExists) {
      return {
        error:
          "Suosittelijaa ei löydy — anna vahvistetun urakoitsijan tai asiakkaan sähköposti.",
      };
    }

    const qualErr = validateContractorQualifications(formData);
    if (qualErr) return { error: qualErr };
    contractorFacts = validateCompanyFactsForm(formData);
    if (!contractorFacts.ok) return { error: contractorFacts.error };
  }

  if (role === "customer" && customerReferrerEmailRaw) {
    if (!isValidReferrerEmail(customerReferrerEmailRaw)) {
      return { error: "Anna kelvollinen suosittelijan sähköpostiosoite." };
    }
    if (
      normalizeReferrerEmail(customerReferrerEmailRaw) ===
      normalizeReferrerEmail(email)
    ) {
      return { error: "Et voi suosittaa itseäsi." };
    }

    const admin = tryCreateAdminClient();
    if (!admin) {
      return { error: "Rekisteröityminen ei onnistu juuri nyt. Yritä myöhemmin." };
    }
    const referrerId = await lookupCustomerIdByEmail(
      admin,
      customerReferrerEmailRaw,
    );
    if (!referrerId) {
      return {
        error:
          "Suosittelijaa ei löydy — tarkista sähköposti tai varmista että suosittelijan asiakastili on vahvistettu.",
      };
    }
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${role === "contractor" ? contractorHomePath() : "/oma-tili"}`,
      data: {
        full_name: fullName || null,
        role: role === "contractor" ? "contractor" : "customer",
        company_name: role === "contractor" ? companyName : null,
        referrer_email:
          role === "contractor" ? normalizeReferrerEmail(referrerEmailRaw) : null,
        customer_referrer_email:
          role === "customer" && customerReferrerEmailRaw
            ? normalizeReferrerEmail(customerReferrerEmailRaw)
            : null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !data.session) {
    if (role === "contractor") {
      await notifyAdminsNewRegistration({
        userId: data.user.id,
        role: "contractor",
        fullName: fullName || null,
        companyName,
        email,
        referrerEmail: referrerEmailRaw,
      });
    }
    if (role === "customer") {
      await notifyAdminsNewRegistration({
        userId: data.user.id,
        role: "customer",
        fullName: fullName || null,
        email,
        referrerEmail: customerReferrerEmailRaw || null,
      });
    }
    return { redirectPath: "/kirjaudu?vahvistus=1" };
  }

  if (data.user && role === "contractor") {
    await supabase
      .from("profiles")
      .update({ role: "contractor" })
      .eq("id", data.user.id);

    const resolvedTrades = await resolveContractorTradeIdsFromForm(
      formData,
      data.user.id,
    );
    if (resolvedTrades.error) {
      return { error: resolvedTrades.error };
    }

    const saveRes = await saveContractorQualifications({
      contractorId: data.user.id,
      companyName: companyName || "Yritys (täydennä profiilissa)",
      tradeIds: resolvedTrades.tradeIds,
      jobTypeIds: parseJobTypeIds(formData),
      refrigerantLicense: parseRefrigerantLicense(formData),
      electricalQualification: parseElectricalQualification(formData),
      lviQualifications: parseLviQualifications(formData),
    });

    if (saveRes.error) {
      return { error: `Tilin luonti onnistui, mutta pätevyydet epäonnistuivat: ${saveRes.error}` };
    }

    if (contractorFacts?.ok) {
      const { founded_year, company_size_band } = contractorFacts.facts;
      const { error: factsErr } = await supabase
        .from("contractor_profiles")
        .update({
          founded_year,
          company_size_band,
          years_in_business: new Date().getFullYear() - founded_year,
        })
        .eq("id", data.user.id);

      if (factsErr) {
        return {
          error: `Tilin luonti onnistui, mutta yritystietojen tallennus epäonnistui: ${factsErr.message}`,
        };
      }
    }

    await syncContractorAccount(data.user);
    await syncUserReferrals(data.user);

    await notifyAdminsNewRegistration({
      userId: data.user.id,
      role: "contractor",
      fullName: fullName || null,
      companyName,
      email,
      referrerEmail: referrerEmailRaw,
    });

    return { redirectPath: contractorHomePath() };
  }

  if (data.user) {
    await syncUserReferrals(data.user);

    await notifyAdminsNewRegistration({
      userId: data.user.id,
      role: "customer",
      fullName: fullName || null,
      email,
      referrerEmail: customerReferrerEmailRaw || null,
    });
  }

  return { redirectPath: "/oma-tili" };
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
    await syncUserReferrals(user);

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

    if (
      isContractorUser &&
      (redirectTo === "/oma-tili" || redirectTo === contractorHomePath())
    ) {
      return { redirectPath: contractorHomePath() };
    }
  }

  return {
    redirectPath: redirectTo.startsWith("/") ? redirectTo : "/oma-tili",
  };
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

  return { redirectPath: "/kirjaudu?salasana=1" };
}
