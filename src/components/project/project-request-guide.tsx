"use client";

import { useMemo, useState } from "react";
import {
  getProjectRequestTemplate,
  isStructuredJobSlug,
  type RequestGuideQuestion,
} from "@/constants/project-request-templates";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function questionAnswered(q: RequestGuideQuestion, description: string): boolean {
  if (!q.keywords?.length) return description.trim().length > 40;
  const norm = normalize(description);
  return q.keywords.some((k) => norm.includes(normalize(k)));
}

export function ProjectRequestGuide({
  jobSlug,
  description,
  onDescriptionChange,
}: {
  jobSlug: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const template = getProjectRequestTemplate(jobSlug);
  const [expanded, setExpanded] = useState(true);

  const answeredIds = useMemo(() => {
    return template.questions
      .filter((q) => questionAnswered(q, description))
      .map((q) => q.id);
  }, [template.questions, description]);

  if (isStructuredJobSlug(jobSlug)) {
    return (
      <aside className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
        <p className="text-sm font-semibold text-sky-950">Ohjattu lomake</p>
        <p className="mt-1 text-sm text-sky-900">
          Lämpöpumpun tiedot kerätään vaiheittain. Täytä kaikki kohdat — laatupiste
          päivittyy yhteenvedossa.
        </p>
      </aside>
    );
  }

  function appendPrompt(line: string) {
    const trimmed = description.trim();
    const next = trimmed ? `${trimmed}\n${line}` : line;
    onDescriptionChange(next);
  }

  return (
    <aside className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-violet-950">{template.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-violet-900">{template.intro}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-violet-700">
          {answeredIds.length}/{template.questions.length} ✓
        </span>
      </button>

      {expanded && (
        <ol className="mt-4 space-y-3">
          {template.questions.map((q) => {
            const done = answeredIds.includes(q.id);
            return (
              <li
                key={q.id}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  done
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-violet-100 bg-white/80"
                }`}
              >
                <p className="font-medium text-stone-900">
                  {done && <span className="mr-1 text-emerald-700">✓</span>}
                  {q.question}
                </p>
                <p className="mt-1 text-xs text-stone-600">{q.hint}</p>
                {!done && (
                  <button
                    type="button"
                    onClick={() => appendPrompt(q.promptLine)}
                    className="mt-2 text-xs font-medium text-violet-800 hover:underline"
                  >
                    Lisää kuvaukseen →
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
