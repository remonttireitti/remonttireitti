import type {
  DeviceCategory,
  MaintenanceRequestKind,
  MaintenanceUrgency,
} from "@/constants/maintenance";

export type DeviceMaintenanceDetails = {
  request_kind: MaintenanceRequestKind;
  device_category: DeviceCategory;
  brand_model: string;
  serial_number: string;
  install_year: number | null;
  issue_description: string;
  symptoms: string[];
  urgency: MaintenanceUrgency;
  preferred_date: string | null;
  unit_still_works: boolean | null;
  special_notes: string;
};

export const INITIAL_DEVICE_MAINTENANCE: DeviceMaintenanceDetails = {
  request_kind: "korjaus",
  device_category: "ilmalampopumppu",
  brand_model: "",
  serial_number: "",
  install_year: null,
  issue_description: "",
  symptoms: [],
  urgency: "flexible",
  preferred_date: null,
  unit_still_works: null,
  special_notes: "",
};
