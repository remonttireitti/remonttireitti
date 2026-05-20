"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createProject,
  type ProjectActionState,
} from "@/app/actions/projects";
import { ProjectPhotoUpload } from "@/components/project/project-photo-upload";
import { RadioCards } from "@/components/project/form-layout";
import {
  DEVICE_CATEGORIES,
  MAINTENANCE_REQUEST_KINDS,
  MAINTENANCE_SYMPTOMS,
  MAINTENANCE_URGENCY_OPTIONS,
  maintenanceJobSlugForKind,
} from "@/constants/maintenance";
import {
  buildDeviceMaintenanceDescription,
  buildMaintenanceTitle,
  urgencyToSchedule,
  validateDeviceMaintenanceDetails,
} from "@/lib/device-maintenance-details";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  INITIAL_DEVICE_MAINTENANCE,
  type DeviceMaintenanceDetails,
} from "@/types/device-maintenance-details";
import type { JobCatalog } from "@/types/job-catalog";

const STEPS = [
  "Pyynnön tyyppi",
  "Laite",
  "Vika ja kiire",
  "Sijainti",
  "Yhteenveto",
] as const;

const inputClass = formInputClass;

type FormState = {
  municipality: string;
  postal_code: string;
  address_line: string;
  contact_email: string;
  contact_phone: string;
  budget_max: string;
};

const initialForm: FormState = {
  municipality: "",
  postal_code: "",
  address_line: "",
  contact_email: "",
  contact_phone: "",
  budget_max: "",
};

type Props = {
  catalog: JobCatalog;
  defaultEmail?: string;
  defaultPhone?: string;
};

export function DeviceMaintenanceWizard({
  catalog,
  defaultEmail = "",
  defaultPhone = "",
}: Props) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<DeviceMaintenanceDetails>({
    ...INITIAL_DEVICE_MAINTENANCE,
  });
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    contact_email: defaultEmail,
    contact_phone: defaultPhone,
  });
  const [clientError, setClientError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [state, formAction, pending] = useActionState<
    ProjectActionState,
    FormData
  >(createProject, {});

  const jobType = useMemo(() => {
    const slug = maintenanceJobSlugForKind(details.request_kind);
    return catalog.jobTypes.find((j) => j.slug === slug) ?? null;
  }, [catalog.jobTypes, details.request_kind]);

  const title = buildMaintenanceTitle(details);
  const description = buildDeviceMaintenanceDescription(details);
  const schedule = urgencyToSchedule(details);

  function updateDetails(patch: Partial<DeviceMaintenanceDetails>) {
    setDetails((d) => ({ ...d, ...patch }));
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSymptom(s: string) {
    setDetails((d) => {
      const has = d.symptoms.includes(s);
      return {
        ...d,
        symptoms: has
          ? d.symptoms.filter((x) => x !== s)
          : [...d.symptoms, s],
      };
    });
  }

  function validateStep(): string | null {
    if (step === 0) return null;
    if (step === 1) {
      if (!details.device_category) return "Valitse laitteen tyyppi.";
      return null;
    }
    if (step === 2) return validateDeviceMaintenanceDetails(details);
    if (step === 3) {
      if (!form.contact_email.includes("@")) return "Tarkista sähköposti.";
      if (!form.contact_phone.trim()) return "Puhelinnumero vaaditaan.";
      if (!form.address_line.trim()) return "Osoite vaaditaan.";
      if (!/^\d{5}$/.test(form.postal_code)) return "Postinumero: 5 numeroa.";
      if (!form.municipality.trim()) return "Kunta vaaditaan.";
      return null;
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      setClientError(err);
      return;
    }
    setClientError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setClientError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  if (!jobType) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Huolto- ja korjaustyypit eivät ole käytössä. Ota yhteyttä ylläpitoon.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="publish" value="true" />
      <input type="hidden" name="details_kind" value="laitteen_huolto" />
      <input
        type="hidden"
        name="details_json"
        value={JSON.stringify(details)}
      />
      <input type="hidden" name="job_type_id" value={jobType.id} />
      <input
        type="hidden"
        name="category_id"
        value={jobType.legacy_category_id ?? ""}
      />
      <input
        type="hidden"
        name="trade_ids"
        value={JSON.stringify(jobType.suggested_trade_ids)}
      />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="flexibility_weeks" value={String(schedule.flexibility_weeks)} />
      <input type="hidden" name="desired_start" value={schedule.desired_start ?? ""} />
      <input type="hidden" name="budget_min" value="" />
      <input type="hidden" name="budget_max" value={form.budget_max} />
      <input type="hidden" name="municipality" value={form.municipality} />
      <input type="hidden" name="postal_code" value={form.postal_code} />
      <input type="hidden" name="address_line" value={form.address_line} />
      <input type="hidden" name="contact_email" value={form.contact_email} />
      <input type="hidden" name="contact_phone" value={form.contact_phone} />

      <nav className="flex flex-wrap gap-2 text-xs text-stone-500">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i === step
                ? "font-semibold text-sky-800"
                : i < step
                  ? "text-stone-400"
                  : ""
            }
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Kilpailuta huolto tai korjaus lämpöpumppulaitteellesi. Urakoitsijat,
            jotka asentavat kyseistä laitetyyppiä, saavat ilmoituksen.
          </p>
          <RadioCards
            name="request_kind"
            value={details.request_kind}
            onChange={(v) =>
              updateDetails({
                request_kind: v as DeviceMaintenanceDetails["request_kind"],
              })
            }
            columns={2}
            options={MAINTENANCE_REQUEST_KINDS.map((k) => ({
              value: k.value,
              label: k.label,
              hint: k.description,
            }))}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <RadioCards
            name="device_category"
            value={details.device_category}
            onChange={(v) =>
              updateDetails({
                device_category: v as DeviceMaintenanceDetails["device_category"],
              })
            }
            columns={2}
            options={DEVICE_CATEGORIES.map((d) => ({
              value: d.value,
              label: d.label,
            }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Merkki / malli</label>
              <input
                type="text"
                value={details.brand_model}
                onChange={(e) => updateDetails({ brand_model: e.target.value })}
                className={inputClass}
                placeholder="Esim. Mitsubishi MSZ-AP25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Sarjanumero</label>
              <input
                type="text"
                value={details.serial_number}
                onChange={(e) => updateDetails({ serial_number: e.target.value })}
                className={inputClass}
                placeholder="Laitetekstistä / tarrasta"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Asennusvuosi</label>
            <input
              type="number"
              min={1980}
              max={new Date().getFullYear()}
              value={details.install_year ?? ""}
              onChange={(e) =>
                updateDetails({
                  install_year: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className={`${inputClass} max-w-xs`}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium">
              Kuvaile vika tai huoltotarve *
            </label>
            <textarea
              rows={5}
              value={details.issue_description}
              onChange={(e) =>
                updateDetails({ issue_description: e.target.value })
              }
              className={inputClass}
              placeholder="Mitä tapahtui, milloin huomasit, mitä olet jo kokeillut…"
            />
          </div>

          <div>
            <p className="text-sm font-medium">Mahdolliset oireet</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MAINTENANCE_SYMPTOMS.map((s) => {
                const on = details.symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      on
                        ? "bg-sky-700 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Toimiiko laite vielä osittain? *</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {[
                { v: true, l: "Kyllä, osittain" },
                { v: false, l: "Ei / ei lämmitystä" },
              ].map((opt) => (
                <label key={String(opt.v)} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="unit_still_works"
                    checked={details.unit_still_works === opt.v}
                    onChange={() => updateDetails({ unit_still_works: opt.v })}
                  />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Kiireellisyys *</p>
            <div className="mt-2 space-y-2">
              {MAINTENANCE_URGENCY_OPTIONS.map((u) => (
                <label key={u.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="urgency"
                    checked={details.urgency === u.value}
                    onChange={() => updateDetails({ urgency: u.value })}
                  />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          {details.urgency === "specific_date" && (
            <div>
              <label className="block text-sm font-medium">Toivottu päivä</label>
              <input
                type="date"
                value={details.preferred_date ?? ""}
                onChange={(e) =>
                  updateDetails({ preferred_date: e.target.value || null })
                }
                className={`${inputClass} max-w-xs`}
              />
            </div>
          )}

          <ProjectPhotoUpload
            files={photoFiles}
            onFilesChange={setPhotoFiles}
            hint="Lisää kuvia laitteesta, virhekoodista tai vuodosta (suositeltu)."
          />

          <div>
            <label className="block text-sm font-medium">
              Arvioitu budjetti max (€, valinnainen)
            </label>
            <input
              type="number"
              min={0}
              value={form.budget_max}
              onChange={(e) => updateForm("budget_max", e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Lisätiedot</label>
            <textarea
              rows={2}
              value={details.special_notes}
              onChange={(e) => updateDetails({ special_notes: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step !== 2 && (
        <ProjectPhotoUpload
          files={photoFiles}
          onFilesChange={setPhotoFiles}
          showUi={false}
        />
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Missä laite sijaitsee? Yhteystiedot näytetään urakoitsijalle vasta
            tarjouksen hyväksynnän jälkeen.
          </p>
          <div>
            <label className="block text-sm font-medium">Sähköposti *</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => updateForm("contact_email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Puhelin *</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => updateForm("contact_phone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Osoite *</label>
            <input
              value={form.address_line}
              onChange={(e) => updateForm("address_line", e.target.value)}
              className={inputClass}
              placeholder="Katu ja asunto"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Postinumero *</label>
              <input
                value={form.postal_code}
                onChange={(e) => updateForm("postal_code", e.target.value)}
                className={inputClass}
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Kunta *</label>
              <input
                value={form.municipality}
                onChange={(e) => updateForm("municipality", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <dl className="space-y-2 text-sm">
          <Row label="Tyyppi" value={title} />
          <Row label="Kuvaus" value={description} />
          <Row label="Sähköposti" value={form.contact_email} />
          <Row label="Puhelin" value={form.contact_phone} />
          <Row
            label="Sijainti"
            value={`${form.address_line}, ${form.postal_code} ${form.municipality}`}
          />
        </dl>
      )}

      {(clientError || state.error) && (
        <p className="text-sm text-red-600" role="alert">
          {clientError ?? state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className={brand.btnSecondary}
            disabled={pending}
          >
            Edellinen
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={next} className={brand.btnPrimary}>
            Seuraava
          </button>
        ) : (
          <button type="submit" disabled={pending} className={brand.btnPrimary}>
            {pending ? "Lähetetään…" : "Julkaise pyyntö"}
          </button>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-medium">{value}</dd>
    </div>
  );
}
