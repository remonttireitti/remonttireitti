"use client";

import { formInputClass } from "@/lib/brand-theme";
import {
  jobSupportsRecurring,
  SERVICE_ENGAGEMENT_TYPE_LABELS,
  SERVICE_FREQUENCY_LABELS,
  SERVICE_SEASON_LABELS,
  type ServiceEngagement,
  type ServiceEngagementType,
  type ServiceFrequency,
  type ServiceSeason,
} from "@/lib/service-engagement";

export function ServiceEngagementFields({
  engagement,
  jobSlug,
  onChange,
}: {
  engagement: ServiceEngagement;
  jobSlug: string | null;
  onChange: (next: ServiceEngagement) => void;
}) {
  const supportsRecurring = jobSupportsRecurring(jobSlug);

  function setType(type: ServiceEngagementType) {
    onChange({
      ...engagement,
      type,
      frequency: type === "recurring" ? engagement.frequency ?? "monthly" : undefined,
      season: engagement.season ?? "year_round",
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
      <div>
        <p className="text-sm font-semibold text-violet-950">Palvelun luonne</p>
        <p className="mt-0.5 text-xs text-violet-900/80">
          Kerro onko kyse kertaluonteisesta työstä vai jatkuvasta palvelusta.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["one_off", "recurring"] as const).map((type) => (
          <label
            key={type}
            className={`flex min-h-[2.75rem] cursor-pointer items-center rounded-2xl border px-4 py-2.5 text-sm has-checked:border-violet-500 has-checked:bg-white ${
              type === "recurring" && !supportsRecurring
                ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                : "border-stone-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="service_engagement_type_ui"
              checked={engagement.type === type}
              disabled={type === "recurring" && !supportsRecurring}
              onChange={() => setType(type)}
              className="mr-2"
            />
            {SERVICE_ENGAGEMENT_TYPE_LABELS[type]}
          </label>
        ))}
      </div>

      {engagement.type === "recurring" && (
        <>
          <div>
            <label className="block text-sm font-medium text-stone-800">
              Toistuvuus *
            </label>
            <select
              value={engagement.frequency ?? ""}
              onChange={(e) =>
                onChange({
                  ...engagement,
                  frequency: e.target.value as ServiceFrequency,
                })
              }
              className={`${formInputClass} mt-1 w-full`}
            >
              <option value="">Valitse…</option>
              {(Object.keys(SERVICE_FREQUENCY_LABELS) as ServiceFrequency[]).map(
                (f) => (
                  <option key={f} value={f}>
                    {SERVICE_FREQUENCY_LABELS[f]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-800">
              Kausi
            </label>
            <select
              value={engagement.season ?? "year_round"}
              onChange={(e) =>
                onChange({
                  ...engagement,
                  season: e.target.value as ServiceSeason,
                })
              }
              className={`${formInputClass} mt-1 w-full`}
            >
              {(Object.keys(SERVICE_SEASON_LABELS) as ServiceSeason[]).map((s) => (
                <option key={s} value={s}>
                  {SERVICE_SEASON_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-800">
              Arvioitu käyntimäärä / vuosi
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={engagement.visits_per_year_estimate ?? ""}
              onChange={(e) =>
                onChange({
                  ...engagement,
                  visits_per_year_estimate: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              placeholder="Esim. 20 (nurmikko kesällä)"
              className={`${formInputClass} mt-1 w-full`}
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-800">
          Lisätiedot toistuvuudesta
        </label>
        <textarea
          rows={2}
          value={engagement.notes ?? ""}
          onChange={(e) =>
            onChange({ ...engagement, notes: e.target.value })
          }
          placeholder="Esim. pihan koko, sisäänkäynti, avain, erityistoiveet…"
          className={`${formInputClass} mt-1 w-full`}
        />
      </div>
    </div>
  );
}
