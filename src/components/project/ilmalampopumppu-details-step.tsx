"use client";

import { ClimateZoneField } from "@/components/project/climate-zone-field";
import { EquipmentSupplyField } from "@/components/project/equipment-supply-field";
import {
  FieldGrid,
  FieldGroup,
  FormGrid,
  FormPage,
  FormSection,
  RadioCards,
  formInputClass,
} from "@/components/project/form-layout";
import { HeatPumpEstimates } from "@/components/project/heat-pump-estimates";
import {
  ILP_COVERAGE_AREA_HINT,
  ILP_COOLING_NEED_OPTIONS,
  ILP_LARGE_AREA_GUIDANCE,
  ILP_MAX_SINGLE_UNIT_COVERAGE_M2,
} from "@/constants/ilmalampopumppu";
import { ilpNeedsLargeAreaGuidance } from "@/lib/ilmalampopumppu-details";
import type {
  IlmalampopumppuDetails,
  IlpMountHeight,
  IlpUnitInstallation,
} from "@/types/ilmalampopumppu-details";
import { createDefaultUnitInstallations } from "@/types/ilmalampopumppu-details";

type Props = {
  details: IlmalampopumppuDetails;
  onChange: (d: IlmalampopumppuDetails) => void;
};

export function IlmalampopumppuDetailsStep({ details: d, onChange }: Props) {
  const set = <K extends keyof IlmalampopumppuDetails>(
    key: K,
    value: IlmalampopumppuDetails[K],
  ) => onChange({ ...d, [key]: value });

  const isDual = d.quote_layout === "two_independent_splits";
  const showLargeAreaHint = ilpNeedsLargeAreaGuidance(d) && !isDual;

  const estimateArea =
    isDual
      ? Math.max(
          ...d.unit_installations.map((u) => u.coverage_area_m2 ?? 0),
          0,
        )
      : d.heated_area_m2;

  function setQuoteLayout(layout: IlmalampopumppuDetails["quote_layout"]) {
    if (layout === "two_independent_splits") {
      onChange({
        ...d,
        quote_layout: "two_independent_splits",
        system_type: "split_1_1",
        indoor_unit_count: 1,
        unit_installations: createDefaultUnitInstallations(),
      });
      return;
    }
    onChange({ ...d, quote_layout: "single" });
  }

  function updateUnit(
    index: number,
    patch: Partial<IlpUnitInstallation>,
  ) {
    const next = d.unit_installations.map((u, i) =>
      i === index ? { ...u, ...patch } : u,
    );
    onChange({ ...d, unit_installations: next });
  }

  return (
    <FormPage intro="Täytä kohdekortit — urakoitsijat käyttävät tietoja tarjouksen pohjana.">
      <FormGrid>
        <FormSection
          span="full"
          title="Kohde ja järjestelmä"
          description="Tarjouksen laajuus, asennus, käyttö ja laatutaso"
        >
          <EquipmentSupplyField
            name="ilp_equipment_supply"
            value={d.equipment_supply}
            onChange={(v) => set("equipment_supply", v)}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <FieldGroup label="Asennus">
                <RadioCards
                  name="ilp_installation_type"
                  value={d.installation_type}
                  onChange={(v) =>
                    set(
                      "installation_type",
                      v as IlmalampopumppuDetails["installation_type"],
                    )
                  }
                  columns={2}
                  options={[
                    { value: "new", label: "Uusi asennus" },
                    { value: "replacement", label: "Pumpun vaihto" },
                  ]}
                />
              </FieldGroup>
              <FieldGroup label="Käyttötarkoitus">
                <RadioCards
                  name="ilp_usage"
                  value={d.usage}
                  onChange={(v) =>
                    set("usage", v as IlmalampopumppuDetails["usage"])
                  }
                  columns={2}
                  options={[
                    { value: "cooling_only", label: "Vain viilennys" },
                    {
                      value: "heating_and_cooling",
                      label: "Lämmitys ja viilennys",
                    },
                  ]}
                />
              </FieldGroup>
              <FieldGroup
                label="Jäähdytystarve"
                hint={
                  d.usage === "cooling_only"
                    ? "Arvio perustuu vaikutusalueeseen kesäkäytössä."
                    : "Ilmalämpöpumppu täydentää lämmitystä — jäähdytystarve erikseen."
                }
              >
                <RadioCards
                  name="ilp_cooling_need"
                  value={d.cooling_need}
                  onChange={(v) =>
                    set("cooling_need", v as IlmalampopumppuDetails["cooling_need"])
                  }
                  columns={1}
                  options={ILP_COOLING_NEED_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                    hint: o.hint,
                  }))}
                />
              </FieldGroup>
            </div>
            <div className="space-y-4">
              <FieldGroup label="Laatutaso">
                <RadioCards
                  name="ilp_quality_tier"
                  value={d.quality_tier}
                  onChange={(v) =>
                    set(
                      "quality_tier",
                      v as IlmalampopumppuDetails["quality_tier"],
                    )
                  }
                  columns={3}
                  options={[
                    { value: "budget", label: "Budjetti" },
                    { value: "standard", label: "Perus" },
                    { value: "premium", label: "Paras" },
                  ]}
                />
              </FieldGroup>
              {!isDual && (
                <FieldGroup
                  label="Järjestelmä"
                  hint="Sisä- ja ulkoyksiköt samassa kokonaisuudessa"
                >
                  <RadioCards
                    name="ilp_system_type"
                    value={d.system_type}
                    onChange={(v) => {
                      if (v === "split_1_1") {
                        onChange({
                          ...d,
                          system_type: "split_1_1",
                          indoor_unit_count: 1,
                        });
                      } else {
                        set("system_type", "multi_split");
                      }
                    }}
                    options={[
                      { value: "split_1_1", label: "1 sisä + 1 ulkoyksikkö" },
                      { value: "multi_split", label: "Multisplit" },
                    ]}
                  />
                  {d.system_type === "multi_split" && (
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={d.indoor_unit_count}
                      onChange={(e) =>
                        set("indoor_unit_count", Number(e.target.value) || 2)
                      }
                      className={`${formInputClass} mt-3 max-w-[8rem]`}
                      aria-label="Sisäyksiköiden määrä"
                    />
                  )}
                </FieldGroup>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          span="full"
          title="Kiinteistö ja energia"
          description="Vaikutusalue, vuosi ja tehoarvio"
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <FieldGrid>
                <FieldGroup label="Kiinteistön tyyppi">
                  <select
                    value={d.property_type}
                    onChange={(e) => set("property_type", e.target.value)}
                    className={formInputClass}
                  >
                    <option value="omakotitalo">Omakotitalo</option>
                    <option value="rivitalo">Rivitalo</option>
                    <option value="paritalo">Paritalo</option>
                    <option value="kerrostalo">Kerrostalo</option>
                    <option value="muu">Muu</option>
                  </select>
                </FieldGroup>

                {!isDual && (
                  <FieldGroup
                    label="Arvioitu vaikutusalue (m²) *"
                    hint={ILP_COVERAGE_AREA_HINT}
                  >
                    <input
                      type="number"
                      min={10}
                      value={d.heated_area_m2 || ""}
                      onChange={(e) =>
                        set("heated_area_m2", Number(e.target.value) || 0)
                      }
                      className={formInputClass}
                    />
                  </FieldGroup>
                )}

                <FieldGroup label="Rakennusvuosi">
                  <input
                    type="number"
                    min={1800}
                    max={2030}
                    placeholder="1985"
                    value={d.build_year ?? ""}
                    onChange={(e) =>
                      set(
                        "build_year",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={formInputClass}
                  />
                </FieldGroup>
              </FieldGrid>

              {showLargeAreaHint && (
                <LargeAreaGuidance
                  onMultisplit={() =>
                    onChange({
                      ...d,
                      system_type: "multi_split",
                      indoor_unit_count: Math.max(2, d.indoor_unit_count),
                      quote_layout: "single",
                    })
                  }
                  onTwoSplits={() => setQuoteLayout("two_independent_splits")}
                />
              )}

              {!isDual && (
                <FieldGroup
                  label="Arvioitu putkimatka ulko- ja sisäyksikön välillä (m)"
                  hint={
                    d.system_type === "multi_split"
                      ? "Arvio kullekin sisäyksikölle erikseen, jos putket eroavat."
                      : "Reittietäisyys ulko- ja sisäyksikön välillä (ei koko talon läpi)."
                  }
                >
                  <input
                    type="number"
                    min={0}
                    placeholder="esim. 5"
                    value={d.pipe_distance_m_per_unit ?? ""}
                    onChange={(e) =>
                      set(
                        "pipe_distance_m_per_unit",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className={formInputClass}
                  />
                </FieldGroup>
              )}

              <ClimateZoneField
                value={d.climate_zone}
                onChange={(z) => set("climate_zone", z)}
              />

              <FieldGroup
                label="Tarjouspyynnön rakenne"
                hint="Suurella alueella voit pyytää tarjouksen kahdesta erillisestä split-laitteesta yhdellä lomakkeella."
              >
                <RadioCards
                  name="ilp_quote_layout"
                  value={d.quote_layout}
                  onChange={(v) =>
                    setQuoteLayout(
                      v as IlmalampopumppuDetails["quote_layout"],
                    )
                  }
                  columns={1}
                  options={[
                    {
                      value: "single",
                      label: "Yksi järjestelmä (split tai multisplit)",
                    },
                    {
                      value: "two_independent_splits",
                      label: "Kaksi erillistä split-laitetta (yksi tarjouspyyntö)",
                      hint: "Yhteinen ulkoseinän materiaali ja ulkoyksikön kiinnitys; putkimatka ja korkeudet laitteittain.",
                    },
                  ]}
                />
              </FieldGroup>
            </div>

            <HeatPumpEstimates
              variant="air"
              heatedAreaM2={estimateArea || d.heated_area_m2}
              climateZone={d.climate_zone}
              buildYear={d.build_year}
              usage={d.usage}
              coolingNeed={d.cooling_need}
            />
          </div>
        </FormSection>

        {isDual ? (
          <>
            {d.unit_installations.map((unit, index) => (
              <FormSection
                key={unit.label}
                title={unit.label}
                description="Oma vaikutusalue, putkimatka ja asennuskorkeudet"
                span="half"
              >
                <FieldGrid cols={1}>
                  <FieldGroup
                    label="Arvioitu vaikutusalue (m²) *"
                    hint={ILP_COVERAGE_AREA_HINT}
                  >
                    <input
                      type="number"
                      min={10}
                      value={unit.coverage_area_m2 ?? ""}
                      onChange={(e) =>
                        updateUnit(index, {
                          coverage_area_m2: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className={formInputClass}
                    />
                  </FieldGroup>
                  <FieldGroup label="Putkimatka ulko- ja sisäyksikön välillä (m)">
                    <input
                      type="number"
                      min={0}
                      placeholder="esim. 5"
                      value={unit.pipe_distance_m ?? ""}
                      onChange={(e) =>
                        updateUnit(index, {
                          pipe_distance_m: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className={formInputClass}
                    />
                  </FieldGroup>
                </FieldGrid>
                <div className="grid gap-4 sm:grid-cols-2">
                  <HeightField
                    label="Sisäyksikön korkeus"
                    height={unit.indoor_mount_height}
                    meters={unit.indoor_mount_height_m}
                    onHeight={(h) =>
                      updateUnit(index, { indoor_mount_height: h })
                    }
                    onMeters={(m) =>
                      updateUnit(index, { indoor_mount_height_m: m })
                    }
                  />
                  <HeightField
                    label="Ulkoyksikön korkeus"
                    height={unit.outdoor_mount_height}
                    meters={unit.outdoor_mount_height_m}
                    onHeight={(h) =>
                      updateUnit(index, { outdoor_mount_height: h })
                    }
                    onMeters={(m) =>
                      updateUnit(index, { outdoor_mount_height_m: m })
                    }
                  />
                </div>
              </FormSection>
            ))}
            <FormSection
              title="Yhteiset asennustiedot"
              description="Kahdelle laitteelle yleensä sama seinä ja kiinnitystapa"
              span="full"
            >
              <SharedInstallationFields d={d} set={set} />
            </FormSection>
          </>
        ) : (
          <FormSection
            title="Asennustekniset"
            description="Seinä, ulkoyksikkö ja korkeudet"
            span="half"
          >
            <SharedInstallationFields d={d} set={set} />
            <div className="grid gap-4 sm:grid-cols-2">
              <HeightField
                label="Sisäyksikön korkeus"
                height={d.indoor_mount_height}
                meters={d.indoor_mount_height_m}
                onHeight={(h) => set("indoor_mount_height", h)}
                onMeters={(m) => set("indoor_mount_height_m", m)}
              />
              <HeightField
                label="Ulkoyksikön korkeus"
                height={d.outdoor_mount_height}
                meters={d.outdoor_mount_height_m}
                onHeight={(h) => set("outdoor_mount_height", h)}
                onMeters={(m) => set("outdoor_mount_height_m", m)}
              />
            </div>
            <div className="space-y-3">
              <YesNo
                name="ilp_outdoor_enclosure"
                value={d.outdoor_enclosure}
                onChange={(v) => set("outdoor_enclosure", v)}
                label="Suojakotelo ulkoyksikölle"
              />
              <YesNo
                name="ilp_outdoor_electrical_included"
                value={d.outdoor_electrical_included}
                onChange={(v) => set("outdoor_electrical_included", v)}
                label="Sähkösyöttö kuuluu urakkaan"
              />
            </div>
          </FormSection>
        )}

        {isDual && (
          <FormSection
            title="Sähkö ja suojaus"
            description="Koskee molempia laitteita"
            span="half"
          >
            <div className="space-y-3">
              <YesNo
                name="ilp_outdoor_enclosure"
                value={d.outdoor_enclosure}
                onChange={(v) => set("outdoor_enclosure", v)}
                label="Suojakotelo ulkoyksikölle"
              />
              <YesNo
                name="ilp_outdoor_electrical_included"
                value={d.outdoor_electrical_included}
                onChange={(v) => set("outdoor_electrical_included", v)}
                label="Sähkösyöttö kuuluu urakkaan"
              />
            </div>
          </FormSection>
        )}

        <FormSection
          title="Aikataulu ja budjetti"
          description="Toivottu ajoitus ja hintaraja"
          span="half"
        >
          <RadioCards
            name="ilp_schedule"
            value={d.schedule}
            onChange={(v) =>
              set("schedule", v as IlmalampopumppuDetails["schedule"])
            }
            columns={3}
            options={[
              { value: "asap", label: "Heti" },
              { value: "flexible", label: "Ei kiire" },
              { value: "specific_date", label: "Tietty päivä" },
            ]}
          />
          {d.schedule === "specific_date" && (
            <FieldGroup label="Asennuspäivä">
              <input
                type="date"
                value={d.installation_date ?? ""}
                onChange={(e) =>
                  set("installation_date", e.target.value || null)
                }
                className={`${formInputClass} max-w-xs`}
              />
            </FieldGroup>
          )}
          <FieldGroup label="Budjetin yläraja (€)">
            <input
              type="number"
              min={0}
              value={d.budget_max_eur ?? ""}
              onChange={(e) =>
                set(
                  "budget_max_eur",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={formInputClass}
            />
          </FieldGroup>
          <YesNo
            name="ilp_accept_offers_over_budget"
            value={d.accept_offers_over_budget}
            onChange={(v) => set("accept_offers_over_budget", v)}
            label="Hyväksyn tarjoukset, vaikka ne ylittäisivät budjetin"
            hint="Kyllä = saat tarjouksia myös budjetin ylärajan ylittäviltä urakoitsijoilta. Ei = toivot tarjouksia enintään ilmoittamasi summan sisällä."
          />
        </FormSection>

        <FormSection title="Lisätiedot" span="full">
          <FieldGroup label="Erikoistoiveet">
            <textarea
              rows={3}
              value={d.special_notes}
              onChange={(e) => set("special_notes", e.target.value)}
              className={formInputClass}
              placeholder="Esim. melurajoitukset, esteet pihalla, toiveet sijoittelusta…"
            />
          </FieldGroup>
        </FormSection>
      </FormGrid>
    </FormPage>
  );
}

function LargeAreaGuidance({
  onMultisplit,
  onTwoSplits,
}: {
  onMultisplit: () => void;
  onTwoSplits: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-medium">
        Vaikutusalue yli {ILP_MAX_SINGLE_UNIT_COVERAGE_M2} m²
      </p>
      <p className="mt-1 leading-relaxed">{ILP_LARGE_AREA_GUIDANCE}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMultisplit}
          className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
        >
          Valitse multisplit
        </button>
        <button
          type="button"
          onClick={onTwoSplits}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-50"
        >
          Pyydä tarjous kahdesta split-laitteesta
        </button>
      </div>
    </div>
  );
}

function SharedInstallationFields({
  d,
  set,
}: {
  d: IlmalampopumppuDetails;
  set: <K extends keyof IlmalampopumppuDetails>(
    key: K,
    value: IlmalampopumppuDetails[K],
  ) => void;
}) {
  return (
    <>
      <FieldGrid>
        <FieldGroup label="Ulkoseinän materiaali *">
          <select
            value={d.exterior_wall_material}
            onChange={(e) => set("exterior_wall_material", e.target.value)}
            className={formInputClass}
          >
            <option value="">Valitse…</option>
            <option value="puu">Puu</option>
            <option value="betoni">Betoni</option>
            <option value="tiili">Tiili</option>
            <option value="kivi">Kivi</option>
            <option value="teräs">Teräs / harkko</option>
            <option value="muu">Muu</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Ulkoyksikön kiinnitys">
          <select
            value={d.outdoor_mounting}
            onChange={(e) =>
              set(
                "outdoor_mounting",
                e.target.value as IlmalampopumppuDetails["outdoor_mounting"],
              )
            }
            className={formInputClass}
          >
            <option value="ground">Maateline</option>
            <option value="wall">Seinäteline</option>
            <option value="plinth">Sokkeliteline</option>
            <option value="balcony">Parveketeline</option>
          </select>
        </FieldGroup>
      </FieldGrid>
    </>
  );
}

function YesNo({
  name,
  value,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/50 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="flex gap-3">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={name}
              checked={value}
              onChange={() => onChange(true)}
            />
            Kyllä
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name={name}
              checked={!value}
              onChange={() => onChange(false)}
            />
            Ei
          </label>
        </span>
      </div>
      {hint && (
        <p className="mt-2 text-xs leading-relaxed text-stone-500">{hint}</p>
      )}
    </div>
  );
}

function HeightField({
  label,
  height,
  meters,
  onHeight,
  onMeters,
}: {
  label: string;
  height: IlpMountHeight;
  meters: number | null;
  onHeight: (h: IlpMountHeight) => void;
  onMeters: (m: number | null) => void;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/30 p-3 text-sm">
      <p className="font-medium text-stone-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={height === "under_3m"}
            onChange={() => onHeight("under_3m")}
          />
          &lt; 3 m
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={height === "over_3m"}
            onChange={() => onHeight("over_3m")}
          />
          &gt; 3 m
        </label>
      </div>
      {height === "over_3m" && (
        <input
          type="number"
          min={3}
          step={0.1}
          placeholder="m"
          value={meters ?? ""}
          onChange={(e) =>
            onMeters(e.target.value ? Number(e.target.value) : null)
          }
          className={`${formInputClass} mt-2 max-w-[6rem]`}
        />
      )}
    </div>
  );
}
