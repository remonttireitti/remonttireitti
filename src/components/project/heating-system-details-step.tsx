"use client";

import { ClimateZoneField } from "@/components/project/climate-zone-field";
import { EquipmentSupplyField } from "@/components/project/equipment-supply-field";
import {
  CheckboxGrid,
  FieldGrid,
  FieldGroup,
  FormGrid,
  FormPage,
  FormSection,
  RadioCards,
  formInputClass,
} from "@/components/project/form-layout";
import { EnergyConsumptionSection } from "@/components/project/energy-consumption-section";
import { HeatPumpEstimates } from "@/components/project/heat-pump-estimates";
import {
  CURRENT_HEATING_OPTIONS,
  formatHeatingTypeLabel,
} from "@/lib/heating-energy";
import type { CurrentHeatingType } from "@/types/heating-energy";
import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";
import {
  effectiveHeatDistribution,
  HEAT_CIRCUIT_OPTIONS,
  isMultiCircuit,
} from "@/lib/heating-system-details";
import type { HeatCircuitType, HeatDistribution } from "@/types/heating-system-details";
import type { HeatingSystemDetails } from "@/types/heating-system-details";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";

const SINGLE_DISTRIBUTION_OPTIONS = HEAT_CIRCUIT_OPTIONS;

type Props = {
  details: HeatingSystemDetails;
  onChange: (d: HeatingSystemDetails) => void;
  showOutdoorFields: boolean;
  sizingVariant: PumpSizingVariant;
  /** Maalämpö: ei asennusta nykyisen lämmityksen rinnalle */
  allowAlongsideInstallation?: boolean;
};

export function HeatingSystemDetailsStep({
  details: d,
  onChange,
  showOutdoorFields,
  sizingVariant,
  allowAlongsideInstallation = true,
}: Props) {
  const set = <K extends keyof HeatingSystemDetails>(
    key: K,
    value: HeatingSystemDetails[K],
  ) => onChange({ ...d, [key]: value });

  const ivlp = showOutdoorFields
    ? (d as IlmavesilampopumppuDetails)
    : null;

  function setOutdoor<K extends keyof IlmavesilampopumppuDetails>(
    key: K,
    value: IlmavesilampopumppuDetails[K],
  ) {
    if (!ivlp) return;
    onChange({ ...ivlp, [key]: value });
  }

  const multiCircuit = isMultiCircuit(d);

  function singleDistributionSelected(): HeatCircuitType[] {
    return d.heat_distribution.filter((x): x is HeatCircuitType =>
      SINGLE_DISTRIBUTION_OPTIONS.some((o) => o.value === x),
    );
  }

  function toggleSingleDistribution(value: HeatCircuitType) {
    if (multiCircuit) return;
    const has = d.heat_distribution.includes(value);
    const next = has
      ? d.heat_distribution.filter((x) => x !== value)
      : [...d.heat_distribution.filter((x) => x !== "multi_circuit"), value];
    onChange({ ...d, heat_distribution: next });
  }

  function toggleMultiCircuitSystem() {
    if (multiCircuit) {
      onChange({
        ...d,
        heat_distribution: singleDistributionSelected(),
        multi_circuit_circuits: [],
      });
      return;
    }
    onChange({
      ...d,
      heat_distribution: ["multi_circuit"],
      multi_circuit_circuits: [],
    });
  }

  function toggleMultiCircuitCircuit(value: HeatCircuitType) {
    const has = d.multi_circuit_circuits.includes(value);
    const next = has
      ? d.multi_circuit_circuits.filter((x) => x !== value)
      : [...d.multi_circuit_circuits, value];
    onChange({
      ...d,
      multi_circuit_circuits: next,
      heat_distribution: ["multi_circuit", ...next],
    });
  }

  function setHeatingType(
    field: "current_heating_type" | "alongside_heating_type",
    type: CurrentHeatingType,
  ) {
    const otherField =
      field === "current_heating_type"
        ? "current_heating_other"
        : "alongside_heating_other";
    onChange({
      ...d,
      [field]: type,
      [otherField]: type === "other" ? d[otherField] : "",
      current_heating:
        field === "current_heating_type"
          ? formatHeatingTypeLabel(type, d.current_heating_other)
          : d.current_heating,
      alongside_heating:
        field === "alongside_heating_type"
          ? formatHeatingTypeLabel(type, d.alongside_heating_other)
          : d.alongside_heating,
      annual_consumption_amount: null,
      electricity_other_loads: [],
      energy_blend_toward_history: null,
    });
  }

  const showEnergyHistory =
    d.installation_scenario === "replacement" ||
    d.installation_scenario === "alongside";

  return (
    <FormPage intro="Täytä kohdekortit — urakoitsijat käyttävät tietoja tarjouksen ja mitoituksen pohjana.">
      <FormGrid>
        <FormSection
          span="full"
          title="Kohde ja tarjous"
          description="Kiinteistö, laatu ja tarjouksen laajuus"
        >
          <EquipmentSupplyField
            value={d.equipment_supply}
            onChange={(v) => set("equipment_supply", v)}
          />
          <div className="grid gap-6 lg:grid-cols-2">
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
            <div className="sm:col-span-2">
              <ClimateZoneField
                value={d.climate_zone}
                onChange={(z) => set("climate_zone", z)}
              />
            </div>
          </FieldGrid>

          <FieldGroup label="Toivottu laatutaso">
            <RadioCards
              value={d.quality_tier}
              onChange={(v) =>
                set(
                  "quality_tier",
                  v as HeatingSystemDetails["quality_tier"],
                )
              }
              columns={3}
              options={[
                { value: "budget", label: "Budjetti" },
                { value: "standard", label: "Keskitaso" },
                { value: "premium", label: "Paras" },
              ]}
            />
            </FieldGroup>
          </div>
        </FormSection>

        <FormSection
          title="Asennustilanne"
          description={
            allowAlongsideInstallation
              ? "Uusintaako, korvaako vai rinnalle"
              : "Uudisasennus tai korvaava asennus"
          }
        >
          <RadioCards
            value={d.installation_scenario}
            onChange={(v) => {
              const scenario = v as HeatingSystemDetails["installation_scenario"];
              onChange({
                ...d,
                installation_scenario: scenario,
                current_heating:
                  scenario === "replacement" ? d.current_heating : "",
                alongside_heating:
                  scenario === "alongside" ? d.alongside_heating : "",
              });
            }}
            options={[
              { value: "new", label: "Uudisasennus" },
              { value: "replacement", label: "Korvataan vanha lämmitys" },
              ...(allowAlongsideInstallation
                ? [
                    {
                      value: "alongside" as const,
                      label: "Nykyisen lämmityksen rinnalle",
                    },
                  ]
                : []),
            ]}
          />
          {d.installation_scenario === "replacement" && (
            <>
              <FieldGroup label="Mikä lämmitys on nyt? *">
                <RadioCards
                  value={d.current_heating_type ?? ""}
                  onChange={(v) =>
                    setHeatingType(
                      "current_heating_type",
                      v as CurrentHeatingType,
                    )
                  }
                  columns={2}
                  options={CURRENT_HEATING_OPTIONS}
                />
              </FieldGroup>
              {d.current_heating_type === "other" && (
                <FieldGroup label="Tarkenna lämmitystapa *">
                  <input
                    value={d.current_heating_other}
                    onChange={(e) => {
                      const text = e.target.value;
                      onChange({
                        ...d,
                        current_heating_other: text,
                        current_heating: formatHeatingTypeLabel("other", text),
                      });
                    }}
                    placeholder="Esim. takka + patterit"
                    className={formInputClass}
                  />
                </FieldGroup>
              )}
            </>
          )}
          {d.installation_scenario === "alongside" && (
            <>
              <FieldGroup label="Minkä lämmityksen rinnalle? *">
                <RadioCards
                  value={d.alongside_heating_type ?? ""}
                  onChange={(v) =>
                    setHeatingType(
                      "alongside_heating_type",
                      v as CurrentHeatingType,
                    )
                  }
                  columns={2}
                  options={CURRENT_HEATING_OPTIONS}
                />
              </FieldGroup>
              {d.alongside_heating_type === "other" && (
                <FieldGroup label="Tarkenna *">
                  <input
                    value={d.alongside_heating_other}
                    onChange={(e) => {
                      const text = e.target.value;
                      onChange({
                        ...d,
                        alongside_heating_other: text,
                        alongside_heating: formatHeatingTypeLabel("other", text),
                      });
                    }}
                    className={formInputClass}
                  />
                </FieldGroup>
              )}
            </>
          )}
        </FormSection>

        <FormSection
          title="Lämmityspiiri"
          description="Lämmönjako ja piirijärjestelmä"
        >
          <FieldGroup
            label="Lämmönjakotapa"
            hint={
              multiCircuit
                ? "Monipiirinen järjestelmä — valitse piiriet alla"
                : "Voit valita useita, jos ei monipiirinen"
            }
          >
            <CheckboxGrid
              options={SINGLE_DISTRIBUTION_OPTIONS}
              selected={multiCircuit ? [] : singleDistributionSelected()}
              onToggle={(value) =>
                toggleSingleDistribution(value as HeatCircuitType)
              }
            />
            <label
              className={`mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                multiCircuit
                  ? "border-sky-600 bg-sky-50 ring-1 ring-sky-600/80"
                  : "border-stone-200 bg-stone-50/50 hover:border-sky-200 hover:bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={multiCircuit}
                onChange={toggleMultiCircuitSystem}
                className="rounded border-stone-300 text-sky-600"
              />
              Monipiirinen järjestelmä
            </label>
          </FieldGroup>
          {multiCircuit && (
            <FieldGroup
              label="Valitse piiriet (vähintään 2) *"
              hint="Esim. patterit alakerrassa ja lattialämmitys yläkerrassa"
            >
              <CheckboxGrid
                options={HEAT_CIRCUIT_OPTIONS}
                selected={d.multi_circuit_circuits}
                onToggle={(value) =>
                  toggleMultiCircuitCircuit(value as HeatCircuitType)
                }
              />
            </FieldGroup>
          )}
        </FormSection>

        <FormSection
          span="full"
          title="Energiatiedot ja arvio"
          description="Pinta-ala, kulutus, käyttövesi ja tehoarvio"
        >
          <div className="grid gap-6 xl:grid-cols-2">
          <FieldGrid>
            <FieldGroup label="Lämmitettävä pinta-ala (m²) *">
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
            <FieldGroup label="Henkilömäärä taloudessa *">
              <input
                type="number"
                min={1}
                max={20}
                value={d.household_size}
                onChange={(e) =>
                  set("household_size", Number(e.target.value) || 1)
                }
                className={formInputClass}
              />
            </FieldGroup>
          </FieldGrid>
          <div className="space-y-4">
          <EnergyConsumptionSection
            details={d}
            onChange={onChange}
            sizingVariant={sizingVariant}
            showHistoricalComparison={showEnergyHistory}
          />
          <HeatPumpEstimates
            variant={sizingVariant}
            heatedAreaM2={d.heated_area_m2}
            climateZone={d.climate_zone}
            buildYear={d.build_year}
            heatDistribution={effectiveHeatDistribution(d)}
            householdSize={d.household_size}
            showAnnualEnergy
          />
          </div>
          </div>
        </FormSection>

        {showOutdoorFields && ivlp && (
          <FormSection
            title="Asennuspaikka"
            description="Ulkoyksikkö ja seinärakenne (vesi-ilmalämpö)"
          >
            <FieldGrid>
              <FieldGroup label="Ulkoseinän rakenne *">
                <select
                  value={ivlp.exterior_wall_structure}
                  onChange={(e) =>
                    setOutdoor("exterior_wall_structure", e.target.value)
                  }
                  className={formInputClass}
                >
                  <option value="">Valitse…</option>
                  <option value="puu">Puu</option>
                  <option value="betoni">Betoni / elementti</option>
                  <option value="tiili">Tiili</option>
                  <option value="kivi">Kivi</option>
                  <option value="harkko">Harkko</option>
                  <option value="muu">Muu</option>
                </select>
              </FieldGroup>
              <FieldGroup label="Ulkoyksikön asennustapa">
                <select
                  value={ivlp.outdoor_mounting}
                  onChange={(e) =>
                    setOutdoor(
                      "outdoor_mounting",
                      e.target.value as IlmavesilampopumppuDetails["outdoor_mounting"],
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
          </FormSection>
        )}

        <FormSection
          title="Budjetti ja lisätiedot"
          description="Hintatoive ja vapaat huomiot"
          span={showOutdoorFields ? "half" : "full"}
        >
          <FieldGroup label="Budjetin yläraja (€)">
            <input
              type="number"
              min={0}
              placeholder="Ei rajaa"
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
          <YesNoRow
            value={d.accept_offers_over_budget}
            onChange={(v) => set("accept_offers_over_budget", v)}
            label="Hyväksyn tarjoukset, vaikka ne ylittäisivät budjetin"
            hint="Kyllä = saat tarjouksia myös budjetin ylärajan ylittäviltä urakoitsijoilta. Ei = toivot tarjouksia enintään ilmoittamasi summan sisällä."
          />
          <FieldGroup label="Erikoistoiveet">
            <textarea
              rows={3}
              value={d.special_notes}
              onChange={(e) => set("special_notes", e.target.value)}
              className={formInputClass}
            />
          </FieldGroup>
        </FormSection>
      </FormGrid>
    </FormPage>
  );
}

function YesNoRow({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50/50 px-3 py-2.5">
      <p className="text-sm font-medium text-stone-700">{label}</p>
      {hint && (
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{hint}</p>
      )}
      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            checked={value}
            onChange={() => onChange(true)}
          />
          Kyllä
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            checked={!value}
            onChange={() => onChange(false)}
          />
          Ei
        </label>
      </div>
    </div>
  );
}
