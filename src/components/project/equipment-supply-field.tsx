"use client";

import { FieldGroup, RadioCards } from "@/components/project/form-layout";
import {
  EQUIPMENT_SUPPLY_OPTIONS,
  OPTIONAL_EQUIPMENT_OFFER_HINT,
} from "@/lib/equipment-supply";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";

type Props = {
  value: EquipmentSupplyScope;
  onChange: (value: EquipmentSupplyScope) => void;
  allowOptionalEquipmentOffer?: boolean;
  onAllowOptionalEquipmentOfferChange?: (value: boolean) => void;
  name?: string;
};

export function EquipmentSupplyField({
  value,
  onChange,
  allowOptionalEquipmentOffer = false,
  onAllowOptionalEquipmentOfferChange,
  name,
}: Props) {
  const showDeviceOffers =
    value === "installation_only" && onAllowOptionalEquipmentOfferChange;

  return (
    <div className="space-y-5">
      <FieldGroup
        label="Mitä tarjousta pyydät?"
        hint="Urakoitsijat näkevät valinnan tarjouspyynnössä"
      >
        <RadioCards
          name={name}
          value={value}
          onChange={(v) => onChange(v as EquipmentSupplyScope)}
          columns={2}
          options={EQUIPMENT_SUPPLY_OPTIONS}
        />
      </FieldGroup>

      {showDeviceOffers && (
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50/80 p-4">
          <p className="text-sm font-semibold text-stone-900">
            Laitteen tarjoukset (valinnainen)
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Hankit laitteet itse, mutta voit silti kuulla urakoitsijoiden
            laitetarjoukset erillisellä hinnalla.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-sky-100 bg-white p-3 text-sm text-stone-800 shadow-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0"
              checked={allowOptionalEquipmentOffer}
              onChange={(e) =>
                onAllowOptionalEquipmentOfferChange(e.target.checked)
              }
            />
            <span>
              <span className="font-medium text-stone-900">
                Salli urakoitsijan tarjota myös laitetta
              </span>
              <span className="mt-1 block text-stone-600">
                {OPTIONAL_EQUIPMENT_OFFER_HINT}
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
