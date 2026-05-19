"use client";

import { useFormStatus } from "react-dom";
import { bootstrapProfile } from "@/app/actions/bootstrap-profile";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
    >
      {pending ? "Synkronoidaan…" : "Synkronoi profiili"}
    </button>
  );
}

export function BootstrapProfileForm() {
  return (
    <form action={bootstrapProfile}>
      <SubmitButton />
    </form>
  );
}
