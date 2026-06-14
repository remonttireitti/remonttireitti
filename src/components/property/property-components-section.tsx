"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deletePropertyComponent,
  savePropertyComponent,
  type PropertyComponentActionState,
} from "@/app/actions/property-components";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  buildComponentDetailLines,
  PROPERTY_COMPONENT_KIND_LABELS,
  PROPERTY_COMPONENT_KINDS,
  type PropertyComponentRow,
} from "@/lib/property-components";
import type { PropertyComponentFileView } from "@/lib/property-component-files";
import { PropertyComponentFilesPanel } from "@/components/property/property-component-files-panel";

const fieldsetClass =
  "space-y-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5";
const labelClass = "block text-sm font-medium text-stone-800";
const hintClass = "mt-1 text-xs text-stone-500";

function ComponentForm({
  propertyId,
  component,
  onCancel,
  onSaved,
}: {
  propertyId: string;
  component?: PropertyComponentRow;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState<
    PropertyComponentActionState,
    FormData
  >(savePropertyComponent, {});

  const [originality, setOriginality] = useState<string>(() => {
    if (component?.is_original === true) return "yes";
    if (component?.is_original === false) return "no";
    return "unknown";
  });

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state.ok, onSaved]);

  return (
    <form action={action} className={fieldsetClass}>
      <input type="hidden" name="property_id" value={propertyId} />
      {component && (
        <input type="hidden" name="component_id" value={component.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={component ? `ckind-${component.id}` : "ckind-new"}
            className={labelClass}
          >
            Osan tyyppi
          </label>
          <select
            id={component ? `ckind-${component.id}` : "ckind-new"}
            name="kind"
            defaultValue={component?.kind ?? "ikkunat"}
            className={formInputClass}
          >
            {PROPERTY_COMPONENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROPERTY_COMPONENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={component ? `cname-${component.id}` : "cname-new"}
            className={labelClass}
          >
            Nimi / tarkenne *
          </label>
          <input
            id={component ? `cname-${component.id}` : "cname-new"}
            name="name"
            type="text"
            required
            minLength={2}
            defaultValue={component?.name ?? ""}
            placeholder="Esim. Pohjakerroksen ikkunat, Peltikatto"
            className={formInputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <span className={labelClass}>Alkuperäinen vai uusittu?</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {[
              { value: "yes", label: "Alkuperäinen" },
              { value: "no", label: "Uusittu" },
              { value: "unknown", label: "En tiedä" },
            ].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="is_original"
                  value={opt.value}
                  checked={originality === opt.value}
                  onChange={() => setOriginality(opt.value)}
                  className="border-stone-300 text-sky-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {originality === "no" && (
          <div>
            <label
              htmlFor={component ? `crenew-${component.id}` : "crenew-new"}
              className={labelClass}
            >
              Uusittu (vuosi tai tarkka päivä)
            </label>
            <input
              id={component ? `crenew-${component.id}` : "crenew-new"}
              name="renewed_at"
              type="date"
              defaultValue={component?.renewed_at ?? ""}
              className={formInputClass}
            />
            <p className={hintClass}>
              Voit syöttää arvion esim. vuoden alusta (1.1.2020).
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor={component ? `cmat-${component.id}` : "cmat-new"}
            className={labelClass}
          >
            Materiaali / tyyppi
          </label>
          <input
            id={component ? `cmat-${component.id}` : "cmat-new"}
            name="material"
            type="text"
            defaultValue={component?.material ?? ""}
            placeholder="Esim. peltikatto, triplex-lasi"
            className={formInputClass}
          />
        </div>

        <div>
          <label
            htmlFor={component ? `cmfr-${component.id}` : "cmfr-new"}
            className={labelClass}
          >
            Valmistaja / urakoitsija
          </label>
          <input
            id={component ? `cmfr-${component.id}` : "cmfr-new"}
            name="manufacturer"
            type="text"
            defaultValue={component?.manufacturer ?? ""}
            className={formInputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor={component ? `cnotes-${component.id}` : "cnotes-new"}
            className={labelClass}
          >
            Muistiinpanot
          </label>
          <textarea
            id={component ? `cnotes-${component.id}` : "cnotes-new"}
            name="notes"
            rows={2}
            defaultValue={component?.notes ?? ""}
            placeholder="Esim. kattoremontin takuu, ikkunoiden U-arvo"
            className={formInputClass}
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className={`${brand.btnPrimary} sm:w-auto`}
        >
          {pending ? "Tallennetaan…" : component ? "Tallenna" : "Lisää osa"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`${brand.btnSecondary} sm:w-auto`}
          >
            Peruuta
          </button>
        )}
      </div>
    </form>
  );
}

function ComponentCard({
  propertyId,
  component,
  files,
}: {
  propertyId: string;
  component: PropertyComponentRow;
  files: PropertyComponentFileView[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<
    PropertyComponentActionState,
    FormData
  >(deletePropertyComponent, {});

  const detailLines = buildComponentDetailLines(component);

  if (editing) {
    return (
      <li className="px-5 py-4 sm:px-6">
        <ComponentForm
          propertyId={propertyId}
          component={component}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-900">{component.name}</p>
            <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-800">
              {PROPERTY_COMPONENT_KIND_LABELS[component.kind]}
            </span>
          </div>
          {detailLines.length > 0 && (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {detailLines.map((line) => (
                <div key={line.label}>
                  <dt className="text-xs font-medium text-stone-500">{line.label}</dt>
                  <dd className="text-sm text-stone-800">{line.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Muokkaa
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="component_id" value={component.id} />
            <button
              type="submit"
              disabled={deletePending}
              onClick={(e) => {
                if (!confirm(`Poistetaanko "${component.name}"?`)) {
                  e.preventDefault();
                }
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Poista
            </button>
          </form>
        </div>
      </div>

      <PropertyComponentFilesPanel
        propertyId={propertyId}
        componentId={component.id}
        files={files}
      />

      {deleteState.error && (
        <p className="mt-2 text-sm text-red-600">{deleteState.error}</p>
      )}
    </li>
  );
}

export function PropertyComponentsSection({
  propertyId,
  components,
  filesByComponent,
}: {
  propertyId: string;
  components: PropertyComponentRow[];
  filesByComponent: Record<string, PropertyComponentFileView[]>;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="mt-8">
      <div className={brand.pageHeaderRow}>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Rakennusosat</h2>
          <p className="mt-1 text-sm text-stone-600">
            Katto, ikkunat, putkisto ja muut rakenteet — alkuperäisyys, uusimisvuosi
            ja liitteet (kuitit, takuut).
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Lisää rakennusosa
          </button>
        )}
      </div>

      {showAdd && (
        <div className={`${brand.section} mt-4 p-5 sm:p-6`}>
          <h3 className="text-sm font-semibold text-stone-900">Uusi rakennusosa</h3>
          <div className="mt-4">
            <ComponentForm
              propertyId={propertyId}
              onCancel={() => setShowAdd(false)}
              onSaved={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {components.length === 0 && !showAdd ? (
        <p className={`${brand.section} mt-3 px-5 py-8 text-sm text-stone-600`}>
          Ei vielä rakennusosia. Lisää esimerkiksi katto, ikkunat tai julkisivu —
          merkitse onko alkuperäinen ja milloin uusittu.
        </p>
      ) : (
        components.length > 0 && (
          <ul className={`${brand.section} mt-3 divide-y divide-stone-100`}>
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                propertyId={propertyId}
                component={component}
                files={filesByComponent[component.id] ?? []}
              />
            ))}
          </ul>
        )
      )}
    </section>
  );
}
