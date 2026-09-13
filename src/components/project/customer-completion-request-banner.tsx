import Link from "next/link";
import {
  criterionLabelFromTemplate,
} from "@/lib/template-criterion-stats";
import { getProjectRequestTemplate } from "@/constants/project-request-templates";
import type { ProjectCompletionRequestRow } from "@/lib/project-completion-requests-server";
import { brand } from "@/lib/brand-theme";

export function CustomerCompletionRequestBanner({
  projectId,
  requests,
  jobSlug,
}: {
  projectId: string;
  requests: ProjectCompletionRequestRow[];
  jobSlug: string | null;
}) {
  if (requests.length === 0) return null;

  const template = getProjectRequestTemplate(jobSlug);
  const latest = requests[0];
  const company = latest.contractorCompany ?? "Urakoitsija";

  const labels = latest.criterion_ids.map((id) =>
    criterionLabelFromTemplate(template, id).label,
  );

  return (
    <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-5">
      <h2 className="font-semibold text-violet-950">Urakoitsija pyytää täydennystä</h2>
      <p className="mt-2 text-sm text-violet-900">
        <span className="font-medium">{company}</span> toivoo lisätietoja ennen
        tarkempaa tarjousta. Voit täydentää pyyntöä — saat parempia ja vertailukelpoisempia
        tarjouksia.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-violet-950">
        {labels.map((label) => (
          <li key={label}>• {label}</li>
        ))}
      </ul>
      {latest.note && (
        <p className="mt-3 text-sm italic text-violet-900">"{latest.note}"</p>
      )}
      {requests.length > 1 && (
        <p className="mt-2 text-xs text-violet-800">
          {requests.length} urakoitsijaa on pyytänyt täydennystä.
        </p>
      )}
      <Link
        href={`/remontti/${projectId}/muokkaa`}
        className={`${brand.btnPrimary} mt-4 inline-flex`}
      >
        Täydennä tarjouspyyntö
      </Link>
    </section>
  );
}
