"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  cancelCustomerProject,
  type CancelProjectActionState,
} from "@/app/actions/projects";

export function CancelProjectButton({
  projectId,
  title,
  submittedBidCount,
}: {
  projectId: string;
  title: string;
  submittedBidCount: number;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    CancelProjectActionState,
    FormData
  >(cancelCustomerProject, {});

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const bidNote =
      submittedBidCount > 0
        ? `\n\n${submittedBidCount} saapunutta tarjousta poistetaan.`
        : "";
    if (
      !confirm(
        `Perutaanko tarjouspyyntö "${title}"?${bidNote}\n\nTätä ei voi perua jälkikäteen.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action} onSubmit={handleSubmit} className="inline-flex">
        <input type="hidden" name="project_id" value={projectId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Perutaan…" : "Peru tarjouspyyntö"}
        </button>
      </form>
      {state.error && (
        <p className="max-w-xs text-right text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="max-w-xs text-right text-xs text-sky-700" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
