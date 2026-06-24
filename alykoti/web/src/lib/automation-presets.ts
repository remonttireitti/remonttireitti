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

/** Sauna/suihku-valoparit solmutasolla (82↔86, 84↔87). Jokaisella 2 relettä (e1, e2). */
const SAUNA_SHOWER_NODE_PAIRS: readonly [number, number][] = [
  [82, 86],
  [84, 87],
];

function nodePairFor(nodeId: number): readonly number[] | null {
  for (const pair of SAUNA_SHOWER_NODE_PAIRS) {
    if (pair.includes(nodeId)) return pair;
  }
  return null;
}

function zwaveControllableEndpointIds(
  nodeId: number,
  devices: HubLightDevice[],
): string[] {
  const eps = devices
    .filter((d) => {
      const p = parseZwaveDeviceId(d.id);
      return p?.nodeId === nodeId && d.controllable;
    })
    .sort((a, b) => (a.endpoint ?? 0) - (b.endpoint ?? 0));
  if (eps.length > 0) return eps.map((d) => d.id);
  return [1, 2].map((ep) => `zwave:${nodeId}:e${ep}`);
}

function endpointIdForNode(
  nodeId: number,
  endpoint: number,
  devices: HubLightDevice[],
): string {
  const found = devices.find((d) => {
    const p = parseZwaveDeviceId(d.id);
    return p?.nodeId === nodeId && (p.endpoint ?? 1) === endpoint;
  });
  return found?.id ?? `zwave:${nodeId}:e${endpoint}`;
}

/** Kaikki peilattavat endpoint-ID:t (lähde + partnerit) UI-ohjaukselle. */
export function expandMirrorCommandIds(
  deviceId: string,
  devices: HubLightDevice[] = [],
): string[] {
  const parsed = parseZwaveDeviceId(deviceId.includes(":") ? deviceId : `zwave:${deviceId}`);
  if (!parsed) return [deviceId];
  const pair = nodePairFor(parsed.nodeId);
  if (!pair) return [deviceId];

  const partnerNodes = pair.filter((n) => n !== parsed.nodeId);
  const ids = new Set<string>();

  if (parsed.endpoint != null) {
    ids.add(endpointIdForNode(parsed.nodeId, parsed.endpoint, devices));
    for (const nodeId of partnerNodes) {
      ids.add(endpointIdForNode(nodeId, parsed.endpoint, devices));
    }
  } else {
    for (const nodeId of pair) {
      for (const epId of zwaveControllableEndpointIds(nodeId, devices)) {
        ids.add(epId);
      }
    }
  }

  return [...ids];
}

/** UI-peilaus: partner-endpointit (ilman itseä). */
export function uiMirrorPartnerIds(
  deviceId: string,
  devices: HubLightDevice[] = [],
): string[] {
  return expandMirrorCommandIds(deviceId, devices).filter(
    (id) => !zwaveIdsMatch(id, deviceId),
  );
}
const SAUNA_SHOWER_SWITCH_PAIRS = [
  {
    name: "Sauna — eteisen sauna/suihku-kytkin (52:1) → valot 82 + 86",
    eteinenNode: 52,
    eteinenEp: 1,
    takkaNode: 82,
    takkaEp: 1,
    localNode: 86,
    localEp: 1,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "saunavalo takka",
    localHint: "saunavalo eteinen",
  },
  {
    name: "Suihku — eteisen sauna/suihku-kytkin (52:2) → valot 84 + 87",
    eteinenNode: 52,
    eteinenEp: 2,
    takkaNode: 84,
    takkaEp: 1,
    localNode: 87,
    localEp: 1,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "suihkuvalo takka",
    localHint: "suihkuvalo eteinen",
  },
] as const;

type SaunaShowerSwitchPair = (typeof SAUNA_SHOWER_SWITCH_PAIRS)[number];

function mirrorTargetsForNodes(
  nodeIds: readonly number[],
  devices: HubLightDevice[],
): string[] {
  const targets: string[] = [];
  for (const nodeId of nodeIds) {
    targets.push(...zwaveControllableEndpointIds(nodeId, devices));
  }
  return targets;
}

/** Eteisen sauna/suihku-seinäkytkin (node 52, Z-Wave-nimi "Eteisen valokytkin") — ei yleinen eteisen kattovalo. */
function zwaveIdsForSwitchPair(
  pair: SaunaShowerSwitchPair,
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

function isSaunaShowerMirrorRule(rule: AutomationRule): boolean {
  if (rule.action.type !== "mirror") return false;
  const n = rule.name.toLocaleLowerCase("fi");
  if (n.includes("sauna") || n.includes("suihku")) return true;
  if (rule.trigger.kind !== "device") return false;
  return /^zwave:52:/.test(rule.trigger.device_id);
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
 * Eteisen seinäkytkin (node 52) kanava 1/2 → sauna (82+86) tai suihku (84+87).
 * UI-peilaus on erillinen: vain 82↔86 ja 84↔87.
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
      missing.push(`Eteisen sauna/suihku-kytkin (zwave:${pair.eteinenNode}:e${pair.eteinenEp})`);
    }
    if (!takka) {
      missing.push(`Takkahuoneen rele (zwave:${pair.takkaNode}:e${pair.takkaEp})`);
    }
    if (!local) {
      missing.push(`Sauna/suihku-valo (zwave:${pair.localNode}:e${pair.localEp})`);
    }
    if (!eteinen || !takka || !local) continue;

    const { eteinen: eteId, takka: takkaId, local: localId } = zwaveIdsForSwitchPair(pair, devices);
    const ruleId = `mirror-${pair.eteinenNode}-e${pair.eteinenEp}-to-${pair.takkaNode}`;
    const saunaNodes = [pair.takkaNode, pair.localNode] as const;
    const targetIds = mirrorTargetsForNodes(saunaNodes, devices);

    rules.push(switchMirrorRule(pair.name, ruleId, eteId, pair.eteinenEp, targetIds));
  }

  return { rules, missing };
}

/** Korjaa vanhat (monikohde-)säännöt nykyiseen kytkinpari-malliin. */
export function repairSaunaShowerMirrorRules(rules: AutomationRule[]): AutomationRule[] {
  const kept = stripReverseSaunaShowerRules(rules.filter((r) => !isSaunaShowerMirrorRule(r)));
  const hardcoded: AutomationRule[] = [];
  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    const eteId = `zwave:${pair.eteinenNode}:e${pair.eteinenEp}`;
    const ruleId = `mirror-${pair.eteinenNode}-e${pair.eteinenEp}-to-${pair.takkaNode}`;
    const targetIds = [
      `zwave:${pair.takkaNode}:e1`,
      `zwave:${pair.takkaNode}:e2`,
      `zwave:${pair.localNode}:e1`,
      `zwave:${pair.localNode}:e2`,
    ];
    hardcoded.push(switchMirrorRule(pair.name, ruleId, eteId, pair.eteinenEp, targetIds));
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
