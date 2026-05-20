import Link from "next/link";
import {
  daysUntilDeadline,
  formatDeadlineFi,
  isCommitDeadlinePassed,
} from "@/lib/bid-acceptance";
import { formatPlatformFeeInvoiceLine } from "@/lib/platform-fee";

type Invoice = {
  status: "pending" | "paid" | "cancelled";
  amount_cents: number;
  due_at: string;
  paid_at: string | null;
};

export function OrderFinalizationStatus({
  invoice,
  contractorName,
  projectId,
  expiredMessage,
}: {
  invoice: Invoice | null;
  contractorName: string;
  projectId: string;
  expiredMessage?: boolean;
}) {
  if (expiredMessage) {
    return (
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm">
        <h2 className="font-semibold text-amber-950">
          Urakoitsija ei viimeistellyt tilausta
        </h2>
        <p className="mt-2 text-amber-900">
          {contractorName} ei maksanut välityspalkkiota määräajassa. Voit nyt
          hyväksyä toisen tarjouksen alla.
        </p>
      </section>
    );
  }

  if (!invoice || invoice.status === "cancelled") {
    return null;
  }

  if (invoice.status === "paid") {
    return (
      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5 text-sm">
        <h2 className="font-semibold text-sky-950">Tilaus vahvistettu</h2>
        <p className="mt-1 text-sky-800">
          {contractorName} on maksanut välityspalkkion. Yhteystiedot ovat nyt
          urakoitsijan käytössä — voitte sopia asennuksesta suoraan.
        </p>
      </section>
    );
  }

  const overdue = isCommitDeadlinePassed(invoice.due_at);
  const daysLeft = daysUntilDeadline(invoice.due_at);

  return (
    <section
      className={`mt-6 rounded-2xl border p-5 text-sm ${
        overdue
          ? "border-amber-300 bg-amber-50"
          : "border-sky-200 bg-sky-50/80"
      }`}
    >
      <h2 className="font-semibold text-stone-900">Tilaus viimeistellään</h2>
      <p className="mt-2 leading-relaxed text-stone-700">
        Valitsit urakoitsijan <strong>{contractorName}</strong>. Hän maksaa
        välityspalkkion ({formatPlatformFeeInvoiceLine(invoice.amount_cents)}){" "}
        {overdue ? (
          <span className="text-amber-800">määräaika on umpeutunut</span>
        ) : (
          <>
            viimeistään{" "}
            <strong>{formatDeadlineFi(invoice.due_at)}</strong>
            {daysLeft > 0 && (
              <span className="text-stone-600"> (n. {daysLeft} pv jäljellä)</span>
            )}
          </>
        )}
        . Sen jälkeen saat ilmoituksen ja yhteystiedot avautuvat urakoitsijalle.
      </p>
      {!overdue && (
        <p className="mt-3 text-xs text-stone-600">
          Jos urakoitsija ei viimeistele tilausta määräajassa, voit valita toisen
          tarjoitsijan automaattisesti vapautuvan vertailun jälkeen.
        </p>
      )}
      {overdue && (
        <p className="mt-3 text-xs text-amber-800">
          Päivitä sivu — vertailu vapautuu pian, jos järjestelmä ei ole vielä
          päivittänyt tilaa. Voit myös{" "}
          <Link href={`/remontti/${projectId}`} className="font-medium underline">
            ladata sivun uudelleen
          </Link>
          .
        </p>
      )}
    </section>
  );
}
