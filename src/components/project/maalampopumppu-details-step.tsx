"use client";

import { useEffect } from "react";
import { HeatingSystemDetailsStep } from "@/components/project/heating-system-details-step";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";

type Props = {
  details: MaalampopumppuDetails;
  onChange: (d: MaalampopumppuDetails) => void;
};

export function MaalampopumppuDetailsStep({ details, onChange }: Props) {
  useEffect(() => {
    if (details.installation_scenario !== "alongside") return;
    onChange({
      ...details,
      installation_scenario: "replacement",
      alongside_heating: "",
    });
  }, [details, onChange]);

  return (
    <HeatingSystemDetailsStep
      details={details}
      onChange={(d) => onChange(d as MaalampopumppuDetails)}
      showOutdoorFields={false}
      sizingVariant="ground"
      allowAlongsideInstallation={false}
    />
  );
}
