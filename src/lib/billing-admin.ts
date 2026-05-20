import { MARKETPLACE_INVOICE_EMAIL } from "@/lib/marketplace-pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications-server";
import { sendEmail, siteUrl } from "@/lib/email";
import { formatPlatformFee } from "@/lib/platform-fee";

/** Sähköposti johon admin-laskutusilmoitukset lähetetään. */
export function getAdminBillingEmail(): string {
  return (
    process.env.ADMIN_BILLING_EMAIL?.trim() ||
    process.env.BILLING_ADMIN_EMAIL?.trim() ||
    MARKETPLACE_INVOICE_EMAIL
  );
}

export async function fetchAdminUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((r) => r.id);
}

type ContractorBilling = {
  companyName: string;
  businessId: string | null;
  billingEmail: string | null;
  billingAddressLine: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  loginEmail: string | null;
};

async function fetchContractorBilling(
  contractorId: string,
): Promise<ContractorBilling> {
  const admin = createAdminClient();
  const { data: cp } = await admin
    .from("contractor_profiles")
    .select(
      "company_name, business_id, billing_email, billing_address_line, billing_postal_code, billing_city",
    )
    .eq("id", contractorId)
    .maybeSingle();

  const { data: auth } = await admin.auth.admin.getUserById(contractorId);

  return {
    companyName: cp?.company_name ?? "—",
    businessId: cp?.business_id ?? null,
    billingEmail: cp?.billing_email ?? null,
    billingAddressLine: cp?.billing_address_line ?? null,
    billingPostalCode: cp?.billing_postal_code ?? null,
    billingCity: cp?.billing_city ?? null,
    loginEmail: auth?.user?.email ?? null,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function billingAddressHtml(b: ContractorBilling): string {
  const lines: string[] = [];
  const invoiceTo = b.billingEmail || b.loginEmail;
  if (invoiceTo) {
    lines.push(
      `<strong>Laskutus-sähköposti:</strong> ${escapeHtml(invoiceTo)}`,
    );
  }
  if (b.businessId) {
    lines.push(`<strong>Y-tunnus:</strong> ${escapeHtml(b.businessId)}`);
  }
  const addr = [b.billingAddressLine, b.billingPostalCode, b.billingCity]
    .filter(Boolean)
    .join(", ");
  if (addr) lines.push(`<strong>Osoite:</strong> ${escapeHtml(addr)}`);
  if (!b.billingEmail && !b.businessId && !addr) {
    lines.push(
      '<em style="color:#b45309">Laskutustiedot puuttuvat profiilista — pyydä urakoitsijaa täydentämään Oma tili.</em>',
    );
  }
  return lines.join("<br/>");
}

/** Ilmoita admineille: uusi välityslasku (tarjous hyväksytty). */
export async function notifyAdminsNewPlatformInvoice(params: {
  invoiceId: string;
  projectId: string;
  projectTitle: string;
  contractorId: string;
  amountCents: number;
}): Promise<void> {
  const billing = await fetchContractorBilling(params.contractorId);
  const amount = formatPlatformFee(params.amountCents);
  const linkPath = "/admin/laskutus";
  const title = "Laskutettava: välitysmaksu";
  const body = `${billing.companyName} — ${params.projectTitle} (${amount})`;

  const adminIds = await fetchAdminUserIds();
  await Promise.all(
    adminIds.map((userId) =>
      createNotification({
        userId,
        type: "billing_pending",
        title,
        body,
        linkPath,
      }),
    ),
  );

  const to = getAdminBillingEmail();
  const bodyHtml = `
    <p>Asiakas hyväksyi tarjouksen. Luo lasku kevytyrittäjäpalvelussasi ja merkitse tila adminissa.</p>
    <ul style="line-height:1.6">
      <li><strong>Urakka:</strong> ${escapeHtml(params.projectTitle)}</li>
      <li><strong>Urakoitsija:</strong> ${escapeHtml(billing.companyName)}</li>
      <li><strong>Summa:</strong> ${escapeHtml(amount)} (+ ALV)</li>
    </ul>
    <p style="margin-top:16px">${billingAddressHtml(billing)}</p>
    <p style="margin-top:24px">
      <a href="${siteUrl(linkPath)}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Avaa laskutusjono</a>
    </p>
  `;

  await sendEmail({
    to,
    subject: `Laskutettava välitysmaksu: ${billing.companyName}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px"><h1 style="font-size:18px">${escapeHtml(title)}</h1>${bodyHtml}</div>`,
  });
}
