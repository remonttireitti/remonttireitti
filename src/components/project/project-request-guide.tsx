"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProjectRequestTemplate,
  isStructuredJobSlug,
  type RequestGuideQuestion,
} from "@/constants/project-request-templates";
import type { LearnedProposal } from "@/lib/learned-proposals";
import type { EmphasizedCriterion } from "@/lib/template-criterion-stats";

const DESCRIPTION_FIELD_ID = "description";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function promptPrefix(promptLine: string): string {
  const idx = promptLine.indexOf(":");
  if (idx > 0) return promptLine.slice(0, idx).trim();
  return promptLine.replace(/___|\[.*?\]/g, "").trim();
}

/** Käyttäjä on täyttänyt kysymyksen oikeasti (ei pelkkä pohjarivi). */
function questionAnswered(q: RequestGuideQuestion, description: string): boolean {
  if (questionPromptFilled(q, description)) return true;
  // Pohjarivi kuvauksessa = lisätty, ei vielä valmis — älä laske avainsanoilla.
  if (questionAddedToDescription(q, description)) return false;
  if (!q.keywords?.length) return description.trim().length > 40;
  const norm = normalize(description);
  return q.keywords.some((k) => norm.includes(normalize(k)));
}

/** Pohjarivi on kuvauksessa (napista tai käsin). */
function questionAddedToDescription(
  q: RequestGuideQuestion,
  description: string,
): boolean {
  const norm = normalize(description);
  if (norm.includes(normalize(q.promptLine))) return true;
  const prefix = promptPrefix(q.promptLine);
  if (prefix.length >= 4 && norm.includes(normalize(prefix))) return true;
  return false;
}

/** Pohjarivillä on oikeaa sisältöä ___-kohdan sijaan. */
function questionMatchesEmphasis(
  q: RequestGuideQuestion,
  criterionId: string,
): boolean {
  if (criterionId === q.id) return true;
  const critPart = criterionId.includes("_")
    ? criterionId.slice(criterionId.indexOf("_") + 1)
    : criterionId;
  const qPart = q.id.includes("_") ? q.id.slice(q.id.indexOf("_") + 1) : q.id;
  return critPart === qPart;
}

function questionPromptFilled(q: RequestGuideQuestion, description: string): boolean {
  const prefix = promptPrefix(q.promptLine);
  if (!prefix) return false;

  for (const row of description.split("\n")) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    if (!normalize(trimmed).includes(normalize(prefix))) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx < 0) continue;

    const value = trimmed.slice(colonIdx + 1).trim();
    if (!value) continue;
    if (/^_{2,}\.?$/.test(value)) continue;
    if (/^\[\s*\]\.?$/.test(value)) continue;
    if (value.length >= 4) return true;
  }
  return false;
}

export function ProjectRequestGuide({
  jobSlug,
  description,
  onDescriptionChange,
  emphasizedCriteria = [],
  learnedInfoNeeds = [],
}: {
  jobSlug: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  emphasizedCriteria?: EmphasizedCriterion[];
  learnedInfoNeeds?: LearnedProposal[];
}) {
  const template = getProjectRequestTemplate(jobSlug);
  const [expanded, setExpanded] = useState(true);
  const [flash, setFlash] = useState<{ questionId: string; message: string } | null>(
    null,
  );
  const jobKey = jobSlug ?? "generic";
  const emphasizedForJob = emphasizedCriteria.filter(
    (c) => c.jobSlug === jobKey && c.requestCount >= 2,
  );
  const infoNeedsForJob = learnedInfoNeeds.filter(
    (p) => p.jobSlug === jobKey && p.kind === "info_need",
  );

  const progress = useMemo(() => {
    let done = 0;
    let added = 0;
    for (const q of template.questions) {
      if (questionAnswered(q, description)) done += 1;
      else if (questionAddedToDescription(q, description)) added += 1;
    }
    return { done, added, total: template.questions.length };
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
          Lämpöpumpun tiedot kerätään vaiheittain. Täytä sen verran kuin tiedät —
          laatupiste kertoo, mitä vielä kannattaisi lisätä.
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

  function appendAllPrompts() {
    const missing = template.questions.filter(
      (q) => !questionAddedToDescription(q, description),
    );
    if (missing.length === 0) {
      setFlash({
        questionId: "_all",
        message: "Kaikki kohdat ovat jo kuvauskentässä.",
      });
      focusDescriptionField();
      return;
    }

    const lines = missing.map((q) => q.promptLine);
    const trimmed = description.trim();
    const next = trimmed ? `${trimmed}\n${lines.join("\n")}` : lines.join("\n");
    onDescriptionChange(next);
    setFlash({
      questionId: "_all",
      message: `Lisättiin ${missing.length} kohtaa kuvauskenttään — täydennä ___-kohdat.`,
    });
    focusDescriptionField();
  }

  function appendPrompt(q: RequestGuideQuestion) {
    if (questionAddedToDescription(q, description)) {
      setFlash({
        questionId: q.id,
        message:
          "Tämä kohta on jo kuvauskentässä — täydennä alla olevaa Kuvaus-kenttää.",
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
        "Lisätty kuvauskenttään alle ↓ Korvaa ___-kohdat omilla tiedoillasi.",
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
          {progress.done}/{progress.total} valmis
          {progress.added > 0 ? ` · ${progress.added} lisätty` : ""}
        </span>
      </button>

      <p className="mt-3 rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2 text-xs leading-relaxed text-violet-950">
        <span className="font-medium">Näin täydennät:</span> valitse kohta → teksti
        lisätään <span className="font-medium">Kuvaus-kenttään</span> alle → täydennä
        tiedot siellä (korvaa ___). Kaikki kohdat eivät ole pakollisia — täydennä sen
        verran kuin jaksat.
      </p>

      {flash && (
        <p
          className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-950"
          role="status"
        >
          {flash.message}
        </p>
      )}

      {(emphasizedForJob.length > 0 || infoNeedsForJob.length > 0) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <p className="font-medium">Urakoitsijat usein pyytävät tarkentamaan:</p>
          <ul className="mt-1 space-y-0.5">
            {emphasizedForJob.map((c) => (
              <li key={c.id}>• {c.label}</li>
            ))}
            {infoNeedsForJob.map((p) => (
              <li key={p.slug}>
                • {p.label}
                <span className="text-amber-800/80">
                  {" "}
                  (pyydetty {p.requestCount} kertaa)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && (
        <>
          <button
            type="button"
            onClick={appendAllPrompts}
            className="mt-4 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            Lisää kaikki kohdat kuvaukseen
          </button>
          <ol className="mt-3 space-y-3">
          {template.questions.map((q) => {
            const done = questionAnswered(q, description);
            const added = !done && questionAddedToDescription(q, description);
            const emphasized = emphasizedForJob.some((c) =>
              questionMatchesEmphasis(q, c.id),
            );

            return (
              <li
                key={q.id}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  done
                    ? "border-emerald-200 bg-emerald-50/50"
                    : added
                      ? "border-sky-200 bg-sky-50/60"
                      : emphasized
                        ? "border-amber-200 bg-amber-50/50 ring-1 ring-amber-200/80"
                        : "border-violet-100 bg-white/80"
                }`}
              >
                <p className="font-medium text-stone-900">
                  {done && <span className="mr-1 text-emerald-700">✓</span>}
                  {added && <span className="mr-1 text-sky-700">↓</span>}
                  {q.question}
                </p>
                <p className="mt-1 text-xs text-stone-600">{q.hint}</p>
                {done ? (
                  <p className="mt-2 text-xs text-emerald-800">Täytetty kuvauksessa.</p>
                ) : added ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-sky-900">
                      Lisätty kuvauskenttään — täydennä alla.
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
                    className="mt-2 text-xs font-medium text-violet-800 hover:underline"
                  >
                    Lisää kysymys kuvauskenttään ↓
                  </button>
                )}
              </li>
            );
          })}
          </ol>
        </>
      )}
    </aside>
  );
}
