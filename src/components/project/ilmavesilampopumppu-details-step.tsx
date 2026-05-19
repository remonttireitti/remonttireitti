"use client";

import { HeatingSystemDetailsStep } from "@/components/project/heating-system-details-step";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";

type Props = {
  details: IlmavesilampopumppuDetails;
  onChange: (d: IlmavesilampopumppuDetails) => void;
};

export function IlmavesilampopumppuDetailsStep({ details, onChange }: Props) {
  return (
    <HeatingSystemDetailsStep
      details={details}
      onChange={(d) => onChange(d as IlmavesilampopumppuDetails)}
      showOutdoorFields
      sizingVariant="water"
    />
  );
}
