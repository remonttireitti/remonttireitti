import type { AutomationRule } from "@/lib/automation";
import { parseZwaveDeviceId } from "@/lib/device-protocol";
import type { HubLightDevice } from "@/lib/hub-lights";

function findDevice(
  devices: HubLightDevice[],
  id: string,
  nameIncludes: string,
): HubLightDevice | undefined {
  return (
    devices.find((d) => d.id === id) ??
    devices.find((d) => d.name.toLocaleLowerCase("fi").includes(nameIncludes.toLocaleLowerCase("fi")))
  );
}

function findZwaveByNode(
  devices: HubLightDevice[],
  nodeId: number,
  endpoint: number | undefined,
  nameIncludes: string,
): HubLightDevice | undefined {
  const epId = endpoint != null ? `zwave:${nodeId}:e${endpoint}` : undefined;
  const rootId = `zwave:${nodeId}`;
  if (epId) {
    const byEp = devices.find((d) => d.id === epId);
    if (byEp) return byEp;
  }
  const byRoot = devices.find((d) => d.id === rootId);
  if (byRoot) return byRoot;
  const parsed = devices.filter((d) => parseZwaveDeviceId(d.id)?.nodeId === nodeId);
  if (endpoint != null) {
    const epMatch = parsed.find((d) => d.endpoint === endpoint);
    if (epMatch) return epMatch;
  }
  return (
    parsed[0] ??
    findDevice(devices, rootId, nameIncludes)
  );
}

function switchMirrorRule(
  name: string,
  stableId: string,
  triggerId: string,
  endpoint: number,
  targetIds: string[],
  mirrorMode: "state" | "toggle_on_press" = "toggle_on_press",
): AutomationRule {
  return {
    id: stableId,
    name,
    enabled: true,
    trigger: {
      kind: "device",
      device_id: triggerId,
      mode: "switch_state",
      press: "short",
      endpoint,
      button: null,
      action: null,
    },
    action: {
      type: "mirror",
      mirror_mode: mirrorMode,
      target_ids: targetIds,
      brightness_pct: null,
    },
  };
}

function zwaveIdsMatch(a: string, b: string): boolean {
  const pa = parseZwaveDeviceId(a.includes(":") ? a : `zwave:${a}`);
  const pb = parseZwaveDeviceId(b.includes(":") ? b : `zwave:${b}`);
  if (!pa || !pb) return a === b;
  if (pa.nodeId !== pb.nodeId) return false;
  return (pa.endpoint ?? 1) === (pb.endpoint ?? 1);
}

/** Sauna/suihku-ryhmät: eteisen kytkin + takkahuoneen rele + eteisen valo. */
const SAUNA_SHOWER_SWITCH_PAIRS = [
  {
    name: "Sauna — eteinen → takkahuone + eteinen",
    eteinenNode: 52,
    eteinenEp: 1,
    takkaNode: 82,
    takkaEp: 1,
    localNode: 86,
    localEp: 1,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "saunavalo takka",
    localHint: "saunavalo eteis",
  },
  {
    name: "Suihku — eteinen → takkahuone + eteinen",
    eteinenNode: 52,
    eteinenEp: 2,
    takkaNode: 84,
    takkaEp: 1,
    localNode: 87,
    localEp: 1,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "suihkuvalo takka",
    localHint: "suihkuvalo eteis",
  },
] as const;

type SaunaShowerPair = (typeof SAUNA_SHOWER_SWITCH_PAIRS)[number];

function zwaveInSaunaShowerGroup(deviceId: string, pair: SaunaShowerPair): boolean {
  const parsed = parseZwaveDeviceId(deviceId.includes(":") ? deviceId : `zwave:${deviceId}`);
  if (!parsed) return false;
  if (parsed.nodeId === pair.eteinenNode) {
    return parsed.endpoint == null || parsed.endpoint === pair.eteinenEp;
  }
  if (parsed.nodeId === pair.takkaNode) {
    return parsed.endpoint == null || parsed.endpoint === pair.takkaEp;
  }
  if (parsed.nodeId === pair.localNode) {
    return parsed.endpoint == null || parsed.endpoint === pair.localEp;
  }
  return false;
}

function zwaveIdsForPair(
  pair: SaunaShowerPair,
  devices: HubLightDevice[],
): { eteinen: string; takka: string; local: string } {
  return {
    eteinen:
      findZwaveByNode(devices, pair.eteinenNode, pair.eteinenEp, pair.eteinenHint)?.id ??
      `zwave:${pair.eteinenNode}:e${pair.eteinenEp}`,
    takka:
      findZwaveByNode(devices, pair.takkaNode, pair.takkaEp, pair.takkaHint)?.id ??
      `zwave:${pair.takkaNode}:e${pair.takkaEp}`,
    local:
      findZwaveByNode(devices, pair.localNode, pair.localEp, pair.localHint)?.id ??
      `zwave:${pair.localNode}:e${pair.localEp}`,
  };
}

/** UI-ohjauksessa samaan ryhmään kuuluvat laitteet (ei itseä). */
export function uiMirrorPartnerIds(
  deviceId: string,
  devices: HubLightDevice[] = [],
): string[] {
  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    if (!zwaveInSaunaShowerGroup(deviceId, pair)) continue;
    const ids =
      devices.length > 0
        ? zwaveIdsForPair(pair, devices)
        : {
            eteinen: `zwave:${pair.eteinenNode}:e${pair.eteinenEp}`,
            takka: `zwave:${pair.takkaNode}:e${pair.takkaEp}`,
            local: `zwave:${pair.localNode}:e${pair.localEp}`,
          };
    return [ids.eteinen, ids.takka, ids.local].filter((id) => !zwaveIdsMatch(id, deviceId));
  }
  return [];
}

function isSaunaShowerMirrorRule(rule: AutomationRule): boolean {
  if (rule.action.type !== "mirror") return false;
  const n = rule.name.toLocaleLowerCase("fi");
  if (n.includes("sauna") || n.includes("suihku")) return true;
  if (rule.trigger.kind !== "device") return false;
  return /^zwave:(52|82|84|86|87)/.test(rule.trigger.device_id);
}

/** Poista takkahuone→eteinen paluusäännöt (aiheuttivat silmukan). */
function stripReverseSaunaShowerRules(rules: AutomationRule[]): AutomationRule[] {
  return rules.filter((r) => {
    if (!isSaunaShowerMirrorRule(r)) return true;
    if (r.trigger.kind !== "device") return true;
    const tid = r.trigger.device_id;
    return tid.startsWith("zwave:52:");
  });
}

/**
 * Eteisen seinäkytkin (node 52) kanava 1/2 → takkahuoneen rele + eteisen valo.
 * Jokaisessa relemoduulissa vain OUT1 (endpoint 1) on käytössä.
 */
export function buildSaunaShowerMirrorPresets(
  devices: HubLightDevice[],
): { rules: AutomationRule[]; missing: string[] } {
  const missing: string[] = [];
  const rules: AutomationRule[] = [];

  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    const eteinen = findZwaveByNode(devices, pair.eteinenNode, pair.eteinenEp, pair.eteinenHint);
    const takka = findZwaveByNode(devices, pair.takkaNode, pair.takkaEp, pair.takkaHint);
    const local = findZwaveByNode(devices, pair.localNode, pair.localEp, pair.localHint);
    if (!eteinen) {
      missing.push(`Eteisen kytkin (zwave:${pair.eteinenNode}:e${pair.eteinenEp})`);
    }
    if (!takka) {
      missing.push(`Takkahuoneen rele (zwave:${pair.takkaNode}:e${pair.takkaEp})`);
    }
    if (!local) {
      missing.push(`Eteisen valo (zwave:${pair.localNode}:e${pair.localEp})`);
    }
    if (!eteinen || !takka || !local) continue;

    const { eteinen: eteId, takka: takkaId, local: localId } = zwaveIdsForPair(pair, devices);
    const ruleId = `mirror-${pair.eteinenNode}-e${pair.eteinenEp}-to-${pair.takkaNode}`;

    rules.push(switchMirrorRule(pair.name, ruleId, eteId, pair.eteinenEp, [takkaId, localId]));
  }

  return { rules, missing };
}

/** Korjaa vanhat (monikohde-)säännöt nykyiseen kytkinpari-malliin. */
export function repairSaunaShowerMirrorRules(rules: AutomationRule[]): AutomationRule[] {
  const kept = stripReverseSaunaShowerRules(rules.filter((r) => !isSaunaShowerMirrorRule(r)));
  const hardcoded: AutomationRule[] = [];
  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    const eteId = `zwave:${pair.eteinenNode}:e${pair.eteinenEp}`;
    const takkaId = `zwave:${pair.takkaNode}:e${pair.takkaEp}`;
    const localId = `zwave:${pair.localNode}:e${pair.localEp}`;
    const ruleId = `mirror-${pair.eteinenNode}-e${pair.eteinenEp}-to-${pair.takkaNode}`;
    hardcoded.push(switchMirrorRule(pair.name, ruleId, eteId, pair.eteinenEp, [takkaId, localId]));
  }
  return [...kept, ...hardcoded];
}

export function mergeMirrorPresets(
  existing: AutomationRule[],
  presets: AutomationRule[],
): AutomationRule[] {
  const kept = stripReverseSaunaShowerRules(
    existing.filter((r) => !isSaunaShowerMirrorRule(r)),
  );
  return [...kept, ...presets];
}
