"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createProject,
  updateProject,
  type ProjectActionState,
} from "@/app/actions/projects";
import type { ProjectEditSnapshot } from "@/lib/project-edit";
import { ProjectAreaJobStep } from "@/components/project/project-area-job-step";
import { genericDescriptionPlaceholder } from "@/constants/project-areas";
import { IlmalampopumppuDetailsStep } from "@/components/project/ilmalampopumppu-details-step";
import { ProjectPhotoUpload } from "@/components/project/project-photo-upload";
import { IlmavesilampopumppuDetailsStep } from "@/components/project/ilmavesilampopumppu-details-step";
import { MaalampopumppuDetailsStep } from "@/components/project/maalampopumppu-details-step";
import {
  buildIlpDescription,
  validateIlpDetails,
} from "@/lib/ilmalampopumppu-details";
import {
  buildIvlpDescription,
  validateIvlpDetails,
} from "@/lib/ilmavesilampopumppu-details";
import {
  buildMaalampDescription,
  validateMaalampDetails,
} from "@/lib/maalampopumppu-details";
import { ProjectSummaryReview } from "@/components/project/project-summary-review";
import {
  INITIAL_ILP_DETAILS,
  type IlmalampopumppuDetails,
} from "@/types/ilmalampopumppu-details";
import {
  INITIAL_IVLP_DETAILS,
  type IlmavesilampopumppuDetails,
} from "@/types/ilmavesilampopumppu-details";
import {
  INITIAL_MAALAMP_DETAILS,
  type MaalampopumppuDetails,
} from "@/types/maalampopumppu-details";
import { brand, formInputClass } from "@/lib/brand-theme";
import type { JobCatalog, JobTypeWithTrades } from "@/types/job-catalog";

const inputClass = formInputClass;

const STEPS = [
  "Valitse remontin tyyppi",
  "Kohde ja budjetti",
  "Yhteystiedot ja sijainti",
  "Yhteenveto",
] as const;

type FormState = {
  job_type_id: string;
  category_id: string;
  trade_ids: string[];
  title: string;
  description: string;
  budget_min: string;
  budget_max: string;
  desired_start: string;
  flexibility_weeks: string;
  municipality: string;
  postal_code: string;
  address_line: string;
  contact_email: string;
  contact_phone: string;
};

const initialForm: FormState = {
  job_type_id: "",
  category_id: "",
  trade_ids: [],
  title: "",
  description: "",
  budget_min: "",
  budget_max: "",
  desired_start: "",
  flexibility_weeks: "4",
  municipality: "",
  postal_code: "",
  address_line: "",
  contact_email: "",
  contact_phone: "",
};

type ProjectWizardProps = {
  catalog: JobCatalog;
  defaultEmail?: string;
  defaultPhone?: string;
  editSnapshot?: ProjectEditSnapshot;
  submittedBidCount?: number;
};

export function ProjectWizard({
  catalog,
  defaultEmail = "",
  defaultPhone = "",
  editSnapshot,
  submittedBidCount = 0,
}: ProjectWizardProps) {
  const isEdit = Boolean(editSnapshot);
  const [step, setStep] = useState(0);
  const [stepValidationError, setStepValidationError] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(() =>
    editSnapshot
      ? { ...editSnapshot.form }
      : {
          ...initialForm,
          contact_email: defaultEmail,
          contact_phone: defaultPhone,
        },
  );
  const [ilpDetails, setIlpDetails] = useState<IlmalampopumppuDetails>(() =>
    editSnapshot?.ilpDetails ? { ...editSnapshot.ilpDetails } : { ...INITIAL_ILP_DETAILS },
  );
  const [ivlpDetails, setIvlpDetails] = useState<IlmavesilampopumppuDetails>(() =>
    editSnapshot?.ivlpDetails
      ? { ...editSnapshot.ivlpDetails }
      : { ...INITIAL_IVLP_DETAILS },
  );
  const [maalampDetails, setMaalampDetails] = useState<MaalampopumppuDetails>(() =>
    editSnapshot?.maalampDetails
      ? { ...editSnapshot.maalampDetails }
      : { ...INITIAL_MAALAMP_DETAILS },
  );
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitIntent, setSubmitIntent] = useState<"draft" | "publish" | null>(
    null,
  );
  const [state, action, pending] = useActionState<ProjectActionState, FormData>(
    isEdit ? updateProject : createProject,
    {},
  );

  const selectedJobType = useMemo(
    () => catalog.jobTypes.find((j) => j.id === form.job_type_id) ?? null,
    [catalog.jobTypes, form.job_type_id],
  );

  const isIlp = selectedJobType?.slug === "ilmalampopumppu";
  const isIvlp = selectedJobType?.slug === "ilmavesilampopumppu";
  const isMaalamp = selectedJobType?.slug === "maalampopumppu";
  const hasStructuredForm = isIlp || isIvlp || isMaalamp;

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function syncIlpToForm(d: IlmalampopumppuDetails) {
    const title = selectedJobType?.name_fi ?? "Ilmalämpöpumppu";
    const description = buildIlpDescription(d);
    const flexibility =
      d.schedule === "asap" ? "2" : d.schedule === "flexible" ? "12" : "4";
    setForm((prev) => ({
      ...prev,
      title,
      description,
      budget_min: "",
      budget_max: d.budget_max_eur != null ? String(d.budget_max_eur) : "",
      desired_start:
        d.schedule === "specific_date" ? (d.installation_date ?? "") : "",
      flexibility_weeks: flexibility,
    }));
  }

  function onJobTypeChange(jt: JobTypeWithTrades | null) {
    setStepValidationError(null);
    if (!jt) {
      update("job_type_id", "");
      update("category_id", "");
      update("trade_ids", []);
      return;
    }
    update("job_type_id", jt.id);
    update("category_id", jt.legacy_category_id ?? "");
    update(
      "trade_ids",
      jt.suggested_trade_ids.length > 0 ? [...jt.suggested_trade_ids] : [],
    );
    if (!form.title || form.title === selectedJobType?.name_fi) {
      update("title", jt.name_fi);
    }
    if (jt.slug === "ilmalampopumppu") {
      setIlpDetails(INITIAL_ILP_DETAILS);
    }
    if (jt.slug === "ilmavesilampopumppu") {
      setIvlpDetails(INITIAL_IVLP_DETAILS);
    }
    if (jt.slug === "maalampopumppu") {
      setMaalampDetails(INITIAL_MAALAMP_DETAILS);
    }
  }

  function stepError(): string | null {
    if (step === 0) {
      if (!form.job_type_id) return "Valitse työ listasta.";
    }
    if (step === 1) {
      if (isIlp) return validateIlpDetails(ilpDetails);
      if (isIvlp) return validateIvlpDetails(ivlpDetails);
      if (isMaalamp) return validateMaalampDetails(maalampDetails);
      if (form.title.trim().length < 5) {
        return "Otsikko: vähintään 5 merkkiä.";
      }
      if (form.description.trim().length < 20) {
        return "Kuvaus: vähintään 20 merkkiä.";
      }
    }
    if (step === 2) {
      if (!form.contact_email.trim()) return "Anna sähköpostiosoite.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
        return "Sähköpostiosoite on virheellinen.";
      }
      const phoneDigits = form.contact_phone.replace(/\D/g, "");
      if (phoneDigits.length < 6) {
        return "Anna kelvollinen puhelinnumero.";
      }
      if (!form.address_line.trim()) return "Anna urakan osoite.";
      if (!form.municipality.trim()) return "Anna kunta.";
      if (!/^\d{5}$/.test(form.postal_code.trim())) {
        return "Postinumero: 5 numeroa (esim. 00100).";
      }
    }
    return null;
  }

  function goNext() {
    const err = stepError();
    if (err) {
      setStepValidationError(err);
      return;
    }
    setStepValidationError(null);
    if (step === 1 && isIlp) syncIlpToForm(ilpDetails);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepValidationError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  const submitTitle = hasStructuredForm
    ? (selectedJobType?.name_fi ?? form.title)
    : form.title;
  const submitDescription = isIlp
    ? buildIlpDescription(ilpDetails)
    : isIvlp
      ? buildIvlpDescription(ivlpDetails)
      : isMaalamp
        ? buildMaalampDescription(maalampDetails)
        : form.description;
  const structuredBudgetMax = isIlp
    ? ilpDetails.budget_max_eur
    : isIvlp
      ? ivlpDetails.budget_max_eur
      : isMaalamp
        ? maalampDetails.budget_max_eur
        : null;
  const submitBudgetMax =
    structuredBudgetMax != null
      ? String(structuredBudgetMax)
      : form.budget_max;
  const submitDesiredStart =
    isIlp && ilpDetails.schedule === "specific_date"
      ? (ilpDetails.installation_date ?? "")
      : form.desired_start;
  const submitFlexibility = isIlp
    ? ilpDetails.schedule === "asap"
      ? "2"
      : ilpDetails.schedule === "flexible"
        ? "12"
        : "4"
    : form.flexibility_weeks;
  const detailsKind = isMaalamp
    ? "maalampopumppu"
    : isIvlp
      ? "ilmavesilampopumppu"
      : isIlp
        ? "ilmalampopumppu"
        : "";
  const detailsJson = isMaalamp
    ? JSON.stringify(maalampDetails)
    : isIvlp
      ? JSON.stringify(ivlpDetails)
      : isIlp
        ? JSON.stringify(ilpDetails)
        : "";

  const summaryBudgetMax =
    isIlp && ilpDetails.budget_max_eur
      ? `n. ${ilpDetails.budget_max_eur} €`
      : isIvlp && ivlpDetails.budget_max_eur
        ? `n. ${ivlpDetails.budget_max_eur} €`
        : isMaalamp && maalampDetails.budget_max_eur
          ? `n. ${maalampDetails.budget_max_eur} €`
          : !hasStructuredForm && form.budget_max
            ? `${form.budget_max} €`
            : null;

  return (
    <WizardShell step={step} steps={STEPS}>
      <form action={action}>
        {isEdit && editSnapshot && (
          <input type="hidden" name="project_id" value={editSnapshot.projectId} />
        )}
        <input type="hidden" name="job_type_id" value={form.job_type_id} />
        <input type="hidden" name="category_id" value={form.category_id} />
        <input
          type="hidden"
          name="trade_ids"
          value={JSON.stringify(form.trade_ids)}
        />
        <input type="hidden" name="title" value={submitTitle} />
        <input type="hidden" name="description" value={submitDescription} />
        <input type="hidden" name="budget_min" value={form.budget_min} />
        <input type="hidden" name="budget_max" value={submitBudgetMax} />
        <input type="hidden" name="desired_start" value={submitDesiredStart} />
        <input
          type="hidden"
          name="flexibility_weeks"
          value={submitFlexibility}
        />
        <input type="hidden" name="municipality" value={form.municipality} />
        <input type="hidden" name="postal_code" value={form.postal_code} />
        <input type="hidden" name="address_line" value={form.address_line} />
        <input type="hidden" name="contact_email" value={form.contact_email} />
        <input type="hidden" name="contact_phone" value={form.contact_phone} />
        {hasStructuredForm && (
          <>
            <input type="hidden" name="details_kind" value={detailsKind} />
            <input type="hidden" name="details_json" value={detailsJson} />
          </>
        )}
        {step === 0 && (
          <ProjectAreaJobStep
            catalog={catalog}
            jobTypeId={form.job_type_id}
            onJobTypeChange={onJobTypeChange}
          />
        )}

        {step === 1 && isIlp && (
          <>
            <IlmalampopumppuDetailsStep
              details={ilpDetails}
              onChange={setIlpDetails}
            />
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-sm font-semibold text-stone-800">
                Kuvat tarjouspyyntöön
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Asennuspaikka, seinät tai ulkoyksikön paikka — valinnainen.
              </p>
              <div className="mt-3">
                <ProjectPhotoUpload
                  files={photoFiles}
                  onFilesChange={setPhotoFiles}
                  showUi
                />
              </div>
            </div>
          </>
        )}
        {isIlp && step !== 1 && (
          <ProjectPhotoUpload
            files={photoFiles}
            onFilesChange={setPhotoFiles}
            showUi={false}
          />
        )}

        {step === 1 && isIvlp && (
          <IlmavesilampopumppuDetailsStep
            details={ivlpDetails}
            onChange={setIvlpDetails}
          />
        )}

        {step === 1 && isMaalamp && (
          <MaalampopumppuDetailsStep
            details={maalampDetails}
            onChange={setMaalampDetails}
          />
        )}

        {step === 1 && !hasStructuredForm && (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium">
                Otsikko *
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">
                Kuvaus *
              </label>
              <textarea
                id="description"
                rows={5}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={inputClass}
                placeholder={genericDescriptionPlaceholder(selectedJobType?.slug ?? null)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="budget_min" className="block text-sm font-medium">
                  Budjetti min (€)
                </label>
                <input
                  id="budget_min"
                  type="number"
                  min={0}
                  value={form.budget_min}
                  onChange={(e) => update("budget_min", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="budget_max" className="block text-sm font-medium">
                  Budjetti max (€)
                </label>
                <input
                  id="budget_max"
                  type="number"
                  min={0}
                  value={form.budget_max}
                  onChange={(e) => update("budget_max", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="desired_start" className="block text-sm font-medium">
                  Toivottu aloitus
                </label>
                <input
                  id="desired_start"
                  type="date"
                  value={form.desired_start}
                  onChange={(e) => update("desired_start", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="flexibility" className="block text-sm font-medium">
                  Joustoa (viikkoa)
                </label>
                <select
                  id="flexibility"
                  value={form.flexibility_weeks}
                  onChange={(e) =>
                    update("flexibility_weeks", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="12">12</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium">
                Sähköpostiosoite *
              </label>
              <input
                id="contact_email"
                type="email"
                autoComplete="email"
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                className={inputClass}
                placeholder="nimi@esimerkki.fi"
              />
            </div>
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium">
                Puhelinnumero *
              </label>
              <input
                id="contact_phone"
                type="tel"
                autoComplete="tel"
                value={form.contact_phone}
                onChange={(e) => update("contact_phone", e.target.value)}
                className={inputClass}
                placeholder="040 123 4567"
              />
            </div>
            <div>
              <label htmlFor="address_line" className="block text-sm font-medium">
                Urakan osoite *
              </label>
              <input
                id="address_line"
                autoComplete="street-address"
                value={form.address_line}
                onChange={(e) => update("address_line", e.target.value)}
                className={inputClass}
                placeholder="Katu 1 A 2"
              />
              <p className="mt-1 text-xs text-stone-500">
                Tarkka osoite, jossa asennus tehdään. Näytetään urakoitsijalle vasta
                tarjouksen hyväksynnän jälkeen.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium">
                  Postinumero *
                </label>
                <input
                  id="postal_code"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.postal_code}
                  onChange={(e) => update("postal_code", e.target.value)}
                  className={inputClass}
                  maxLength={5}
                  placeholder="00100"
                />
              </div>
              <div>
                <label htmlFor="municipality" className="block text-sm font-medium">
                  Kunta *
                </label>
                <input
                  id="municipality"
                  autoComplete="address-level2"
                  value={form.municipality}
                  onChange={(e) => update("municipality", e.target.value)}
                  className={inputClass}
                  placeholder="Helsinki"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && isEdit && submittedBidCount > 0 && (
          <p
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            Pyynnössä on jo {submittedBidCount} tarjousta. Muutosten jälkeen
            urakoitsijoiden täytyy päivittää tarjouksensa ennen kuin voit hyväksyä
            niitä.
          </p>
        )}

        {step === 3 && (
          <ProjectSummaryReview
            jobTypeName={selectedJobType?.name_fi ?? "—"}
            title={form.title || (selectedJobType?.name_fi ?? "—")}
            description={submitDescription}
            isIlp={isIlp}
            ilpDetails={ilpDetails}
            isIvlp={isIvlp}
            ivlpDetails={ivlpDetails}
            isMaalamp={isMaalamp}
            maalampDetails={maalampDetails}
            hasStructuredForm={hasStructuredForm}
            contactEmail={form.contact_email}
            contactPhone={form.contact_phone}
            addressLine={form.address_line}
            postalCode={form.postal_code}
            municipality={form.municipality}
            budgetMaxLabel={summaryBudgetMax}
            photoCount={photoFiles.length}
          />
        )}

        {stepValidationError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {stepValidationError}
          </p>
        )}

        {state.error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className={brand.btnSecondary}
            >
              Takaisin
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className={brand.btnPrimary}
            >
              Seuraava
            </button>
          ) : isEdit ? (
            <button
              type="submit"
              disabled={pending}
              className={`${brand.btnPrimary} disabled:opacity-60`}
            >
              {pending ? "Tallennetaan…" : "Tallenna muutokset"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                name="publish"
                value="false"
                disabled={pending}
                onClick={() => setSubmitIntent("draft")}
                className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium hover:bg-stone-50 disabled:opacity-60"
              >
                {pending && submitIntent === "draft"
                  ? "Tallennetaan…"
                  : "Tallenna luonnos"}
              </button>
              <button
                type="submit"
                name="publish"
                value="true"
                disabled={pending}
                onClick={() => setSubmitIntent("publish")}
                className={`${brand.btnPrimary} disabled:opacity-60`}
              >
                {pending && submitIntent === "publish"
                  ? "Julkaistaan…"
                  : "Julkaise tarjouspyyntö"}
              </button>
            </>
          )}
        </div>
      </form>
    </WizardShell>
  );
}

function WizardShell({
  step,
  steps,
  children,
}: {
  step: number;
  steps: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <ol className="mb-8 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === step
                ? brand.stepActive
                : i < step
                  ? brand.stepDone
                  : brand.stepTodo
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}

