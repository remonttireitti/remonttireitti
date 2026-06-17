export {
  airfiToHubState,
  applyVentilationControl,
  computeVentilationTargets,
  executeAirfiCommand as executeVentilationCommand,
  fetchAirfiState as fetchVentilationState,
  hubStateToAirfiState,
  setAirfiAway as setVentilationAway,
  setDirectFanPct as setVentilationFans,
  type AirfiState,
  type VentilationTargets,
} from "@/lib/airfi";
