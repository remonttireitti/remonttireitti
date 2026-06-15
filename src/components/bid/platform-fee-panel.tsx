"use client";

import { useActionState } from "react";
import {
  simulatePayPlatformInvoice,
  type PlatformInvoiceActionState,
} from "@/app/actions/platform-invoices";
import { formatDeadlineFi } from "@/lib/bid-acceptance";
import { brand } from "@/lib/brand-theme";
import { formatPlatformFeeInvoiceLine } from "@/lib/platform-fee";

type Invoice = {
  id: string;
  status: "pending" | "paid" | "cancelled";
  amount_cents: number;
  due_at: string;
  paid_at: string | null;
};

type Contact = {
  contact_email: string;
  contact_phone: string;
  address_line: string;
  postal_code: string;
  municipality: string;
};

export function PlatformFeePanel({
  invoice,
  contact,
  simulateEnabled,
}: {
  invoice: Invoice;
  contact: Contact | null;
  simulateEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<
    PlatformInvoiceActionState,
    FormData
  >(simulatePayPlatformInvoice, {});

  if (invoice.status === "paid" && contact) {
    return (
      <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50/60 p-6">
        <h2 className="font-semibold text-sky-950">Asiakkaan yhteystiedot</h2>
        <p className="mt-1 text-sm text-sky-800">
          {invoice.amount_cents === 0 ? (
            <>Beta-etu: ei välitysmaksua — yhteystiedot avattu.</>
          ) : (
            <>
              Välitysmaksu maksettu{" "}
              {invoice.paid_at &&
                new Date(invoice.paid_at).toLocaleDateString("fi-FI")}
              .
            </>
          )}
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-stone-500">Sähköposti</dt>
            <dd className="font-medium">
              <a
                href={`mailto:${contact.contact_email}`}
                className="text-sky-700 hover:underline"
              >
                {contact.contact_email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Puhelin</dt>
            <dd className="font-medium">
              <a
                href={`tel:${contact.contact_phone.replace(/\s/g, "")}`}
                className="text-sky-700 hover:underline"
              >
                {contact.contact_phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Urakan osoite</dt>
            <dd className="font-medium">
              {contact.address_line}, {contact.postal_code}{" "}
              {contact.municipality}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-orange-200 bg-orange-50/70 p-6">
      <h2 className="font-semibold text-orange-950">Välitysmaksu</h2>
      <p className="mt-2 text-sm text-orange-900">
        Asiakas on hyväksynyt tarjouksesi. Maksa välityspalkkio:{" "}
        <strong>{formatPlatformFeeInvoiceLine(invoice.amount_cents)}</strong> — sen
        jälkeen näet asiakkaan yhteystiedot ja urakan osoitteen.
      </p>
      <p className="mt-2 text-xs text-orange-800">
        Maksa viimeistään <strong>{formatDeadlineFi(invoice.due_at)}</strong>.
        Jos et maksa määräajassa, diili raukeaa ja asiakas voi valita toisen
        urakoitsijan — yhteystietoja ei avata.
      </p>

      {state.error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      {simulateEnabled ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <button
            type="submit"
            disabled={pending}
            className={brand.btnPrimary}
          >
            {pending ? "Käsitellään…" : "Simuloi maksu (kehitys)"}
          </button>
          <p className="mt-2 text-xs text-stone-600">
            Tuotannossa tässä on Stripe-laskun maksulinkki.
          </p>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-white/80 px-3 py-2 text-sm text-stone-700">
          Lasku lähetetään manuaalisesti kevytyrittäjäpalvelun kautta
          laskutustietoihisi (Oma tili → Laskutustiedot). Maksun jälkeen
          yhteystiedot avautuvat automaattisesti. Ota yhteyttä tukeen, jos et
          saa laskua 2 arkipäivän kuluessa.
        </p>
      )}
    </section>
  );
}
