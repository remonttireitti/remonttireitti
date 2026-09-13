export function GuestVerifyBanner({ email }: { email: string }) {
  return (
    <p
      className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"
      role="status"
    >
      <span className="font-semibold">Tarkista sähköpostisi.</span> Lähetimme vahvistuslinkin
      osoitteeseen <span className="font-medium">{email}</span>. Tarjouspyyntö julkaistaan
      urakoitsijoille vasta linkin avaamisen jälkeen — näin estämme roskapyynnöt.
    </p>
  );
}
