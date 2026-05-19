import { formatPlatformFee } from "@/lib/platform-fee";

type Invoice = {
  status: "pending" | "paid" | "cancelled";
  amount_cents: number;
  due_at: string;
  paid_at: string | null;
  contractor_profiles: { company_name: string } | { company_name: string }[] | null;
};

export function CustomerPlatformFeeStatus({
  invoice,
}: {
  invoice: Invoice | null;
}) {
  if (!invoice) return null;

  const company = Array.isArray(invoice.contractor_profiles)
    ? invoice.contractor_profiles[0]?.company_name
    : invoice.contractor_profiles?.company_name;

  if (invoice.status === "paid") {
    return (
      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5 text-sm">
        <h2 className="font-semibold text-sky-950">Yhteystiedot urakoitsijalle</h2>
        <p className="mt-1 text-sky-800">
          {company ?? "Urakoitsija"} on maksanut välityspalkkion. Hän näkee nyt
          sähköpostisi, puhelimesi ja urakan osoitteen.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm">
      <h2 className="font-semibold text-amber-950">Odotetaan välitysmaksua</h2>
      <p className="mt-1 text-amber-900">
        Hyväksyit tarjouksen urakoitsijalta{" "}
        <strong>{company ?? "—"}</strong>. Yhteystietosi (sähköposti, puhelin,
        osoite) avautuvat vasta kun urakoitsija maksaa välityspalkkion{" "}
        {formatPlatformFee(invoice.amount_cents)}.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Eräpäivä urakoitsijan laskulla:{" "}
        {new Date(invoice.due_at).toLocaleDateString("fi-FI")}
      </p>
    </section>
  );
}
