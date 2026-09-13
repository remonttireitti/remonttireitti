"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProjectRequestTemplate,
  isStructuredJobSlug,
  type RequestGuideQuestion,
} from "@/constants/project-request-templates";
import type { EmphasizedCriterion } from "@/lib/template-criterion-stats";

const DESCRIPTION_FIELD_ID = "description";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function questionAnswered(q: RequestGuideQuestion, description: string): boolean {
  if (!q.keywords?.length) return description.trim().length > 40;
  const norm = normalize(description);
  return q.keywords.some((k) => norm.includes(normalize(k)));
}

function questionAddedToDescription(q: RequestGuideQuestion, description: string): boolean {
  const norm = normalize(description);
  if (norm.includes(normalize(q.promptLine))) return true;
  const prefix = q.promptLine.split(":")[0]?.trim();
  if (prefix && prefix.length >= 8 && norm.includes(normalize(prefix))) return true;
  return false;
}

export function ProjectRequestGuide({
  jobSlug,
  description,
  onDescriptionChange,
  emphasizedCriteria = [],
}: {
  jobSlug: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  emphasizedCriteria?: EmphasizedCriterion[];
}) {
  const template = getProjectRequestTemplate(jobSlug);
  const [expanded, setExpanded] = useState(true);
  const [flash, setFlash] = useState<{ questionId: string; message: string } | null>(
    null,
  );
  const emphasizedForJob = emphasizedCriteria.filter(
    (c) => c.jobSlug === (jobSlug ?? "generic") && c.requestCount >= 2,
  );

  const answeredIds = useMemo(() => {
    return template.questions
      .filter((q) => questionAnswered(q, description))
      .map((q) => q.id);
  }, [template.questions, description]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 8000);
    return () => window.clearTimeout(timer);
  }, [flash]);

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

  function focusDescriptionField() {
    const el = document.getElementById(DESCRIPTION_FIELD_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLTextAreaElement) {
      window.setTimeout(() => el.focus(), 300);
    }
  }

  function appendPrompt(q: RequestGuideQuestion) {
    if (questionAddedToDescription(q, description)) {
      setFlash({
        questionId: q.id,
        message:
          "Tämä kohta on jo kuvauskentässä — täydennä alla olevaa kenttää omilla tiedoillasi.",
      });
      focusDescriptionField();
      return;
    }

    const trimmed = description.trim();
    const next = trimmed ? `${trimmed}\n${q.promptLine}` : q.promptLine;
    onDescriptionChange(next);
    setFlash({
      questionId: q.id,
      message:
        "Lisätty kuvauskenttään alle ↓ Korvaa ___-kohdat ja hakasulkeet omilla tiedoillasi.",
    });
    focusDescriptionField();
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

      <p className="mt-3 rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2 text-xs leading-relaxed text-violet-950">
        <span className="font-medium">Näin täydennät:</span> valitse alta kohta → teksti
        lisätään automaattisesti <span className="font-medium">Kuvaus-kenttään</span> sivun
        alaosassa → siirry sinne ja täydennä tiedot (korvaa ___ ja [ ] -kohdat).
      </p>

      {flash && (
        <p
          className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-950"
          role="status"
        >
          {flash.message}
        </p>
      )}

      {emphasizedForJob.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <p className="font-medium">Urakoitsijat usein pyytävät tarkentamaan:</p>
          <ul className="mt-1 space-y-0.5">
            {emphasizedForJob.map((c) => (
              <li key={c.id}>• {c.label}</li>
            ))}
          </ul>
        </div>
      )}

      {expanded && (
        <ol className="mt-4 space-y-3">
          {template.questions.map((q) => {
            const done = answeredIds.includes(q.id);
            const added = questionAddedToDescription(q, description);
            const justAdded = flash?.questionId === q.id;

            return (
              <li
                key={q.id}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  done
                    ? "border-emerald-200 bg-emerald-50/50"
                    : added
                      ? "border-sky-200 bg-sky-50/50"
                      : "border-violet-100 bg-white/80"
                }`}
              >
                <p className="font-medium text-stone-900">
                  {done && <span className="mr-1 text-emerald-700">✓</span>}
                  {q.question}
                </p>
                <p className="mt-1 text-xs text-stone-600">{q.hint}</p>
                {done ? (
                  <p className="mt-2 text-xs text-emerald-800">Vastattu kuvauksessa.</p>
                ) : added ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-sky-900">
                      Lisätty kuvauskenttään — täydennä alla olevassa Kuvaus-kentässä.
                    </p>
                    <button
                      type="button"
                      onClick={focusDescriptionField}
                      className="text-xs font-medium text-sky-800 hover:underline"
                    >
                      Siirry kuvauskenttään ↓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => appendPrompt(q)}
                    className={`mt-2 text-xs font-medium hover:underline ${
                      justAdded ? "text-sky-800" : "text-violet-800"
                    }`}
                  >
                    Lisää kysymys kuvauskenttään ↓
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
