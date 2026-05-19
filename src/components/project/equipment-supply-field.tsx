"use client";

import { FieldGroup, RadioCards } from "@/components/project/form-layout";
import { EQUIPMENT_SUPPLY_OPTIONS } from "@/lib/equipment-supply";
import type { EquipmentSupplyScope } from "@/types/equipment-supply";

type Props = {
  value: EquipmentSupplyScope;
  onChange: (value: EquipmentSupplyScope) => void;
  name?: string;
};

export function EquipmentSupplyField({ value, onChange, name }: Props) {
  return (
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
  );
}
