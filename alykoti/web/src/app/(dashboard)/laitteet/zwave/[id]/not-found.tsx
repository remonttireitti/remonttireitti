import Link from "next/link";
import { LAITTEET } from "@/lib/laitteet-paths";

export default function ZwaveDeviceNotFound() {
  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700">
      <p className="font-semibold text-stone-900">Z-Wave-laitetta ei löydy</p>
      <p className="mt-2">
        Laite ei ole hubin tilassa tai synkki ei ole vielä päivittänyt laitelistaa.
      </p>
      <Link href={LAITTEET.zwave} className="mt-4 inline-block font-medium text-stone-900 underline">
        ← Takaisin Z-Wave-listaan
      </Link>
    </div>
  );
}
