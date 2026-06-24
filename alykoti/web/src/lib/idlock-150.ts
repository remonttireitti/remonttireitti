import type { HubLightDevice } from "@/lib/hub-lights";
import type { ZwaveNodeDetail } from "@/lib/types";

export type IdLockModel = "150" | "101";

export function isIdLockDevice(
  device: Pick<HubLightDevice, "name" | "kind" | "capabilities" | "manufacturer">,
  zwaveNode?: ZwaveNodeDetail | null,
): boolean {
  const n = device.name.toLowerCase();
  if (/id\s*lock|idlock|etuoven\s+lukko/.test(n)) return true;
  const mf = (device.manufacturer ?? "").toLowerCase();
  if (mf.includes("id lock") || mf.includes("idlock")) return true;
  if (device.kind === "lock") return true;
  if (device.capabilities?.some((c) => c.id === "lock")) return true;
  const modelParam = zwaveNode?.config?.find((c) => c.param === 7)?.value;
  if (modelParam === 96 || modelParam === 65 || modelParam === 150 || modelParam === 101) {
    return true;
  }
  return false;
}

export function detectIdLockModel(zwaveNode?: ZwaveNodeDetail | null): IdLockModel {
  const modelParam = zwaveNode?.config?.find((c) => c.param === 7)?.value;
  if (modelParam === 65 || modelParam === 101) return "101";
  return "150";
}

export function idLockConfigLabel(param: number): string | null {
  const labels: Record<number, string> = {
    1: "Lukitustila (Door Lock Mode)",
    2: "RFID-tila",
    3: "Saranan puoli",
    4: "Ovian äänenvoimakkuus",
    5: "Uudelleenlukitus (ReLock)",
    6: "Huolto-PIN-tila (palvelu-PIN)",
    7: "Mallityyppi",
    8: "Päivitystila (Updater)",
    9: "Pää-PIN avaa lukon",
  };
  return labels[param] ?? null;
}

export function idLockConfigDescription(param: number, model: IdLockModel): string | null {
  const common: Record<number, string> = {
    1: "Määrittää lukitustavan ja poissa-tilan käyttäytymisen avauksen jälkeen.",
    2:
      model === "150"
        ? "RFID-avaimien rekisteröinti ja käyttö. Oletus: RFID käytössä (5)."
        : "Vain ID Lock 150 -mallissa.",
    3: "Oven saranan puoli — oikea (oletus) tai vasen.",
    4: "Numeronäppäimistön ja lukon äänet. 0 = pois, 1–6 = voimakkuustaso (oletus 5).",
    5: "Uudelleenlukitus: lukko lukittuu automaattisesti uudelleen avauksen jälkeen.",
    6: "Huolto-PIN (indeksi 108): kuinka monta kertaa tai kuinka kauan palveluvalikko on käytössä.",
    7: "Vain luku. 101 = ID Lock 101, 150 = ID Lock 150.",
    8: "ID Lock 150 Updater -sovelluksen käyttö (iOS/Android, idlock.no/updater).",
    9: "Pää-PIN (indeksi 109): voiko pää-PIN avata lukon suoraan (oletus: kyllä).",
  };
  return common[param] ?? null;
}

export function idLockConfigOptions(
  param: number,
  model: IdLockModel,
): Array<{ label: string; value: number }> | null {
  switch (param) {
    case 1:
      return [
        { label: "Manuaalinen lukitus, poissa pois", value: 0 },
        { label: "Automaattilukitus, poissa pois (oletus)", value: 1 },
        { label: "Manuaalinen lukitus, poissa päällä", value: 2 },
        { label: "Automaattilukitus, poissa päällä", value: 3 },
      ];
    case 2:
      if (model !== "150") return null;
      return [
        { label: "RFID käytössä (oletus)", value: 5 },
        { label: "RFID pois käytöstä", value: 9 },
      ];
    case 3:
      return [
        { label: "Oikea sarana (oletus)", value: 0 },
        { label: "Vasen sarana", value: 1 },
      ];
    case 4:
      return [
        { label: "Äänet pois", value: 0 },
        { label: "Taso 1", value: 1 },
        { label: "Taso 2", value: 2 },
        { label: "Taso 3", value: 3 },
        { label: "Taso 4", value: 4 },
        { label: "Taso 5 (oletus)", value: 5 },
        { label: "Taso 6", value: 6 },
      ];
    case 5:
      return [
        { label: "ReLock pois", value: 0 },
        { label: "ReLock päällä (oletus)", value: 1 },
      ];
    case 6:
      return [
        { label: "Poissa käytöstä (oletus)", value: 0 },
        { label: "1 käyttökerta", value: 1 },
        { label: "2 käyttökertaa", value: 2 },
        { label: "5 käyttökertaa", value: 3 },
        { label: "10 käyttökertaa", value: 4 },
        { label: "Aina voimassa", value: 7 },
        { label: "12 tuntia", value: 8 },
        { label: "24 tuntia", value: 9 },
        { label: "PIN- ja huoltovalikko pois (FE)", value: 0xfe },
      ];
    case 7:
      return [
        { label: "ID Lock 101", value: 65 },
        { label: "ID Lock 150", value: 96 },
      ];
    case 8:
      if (model !== "150") return null;
      return [
        { label: "Updater pois, ei ääntä (oletus)", value: 0 },
        { label: "Updater päällä, ei ääntä", value: 1 },
        { label: "Updater pois", value: 2 },
        { label: "Updater päällä", value: 3 },
      ];
    case 9:
      return [
        { label: "Pää-PIN ei avaa (pois)", value: 0 },
        { label: "Pää-PIN avaa lukon (oletus)", value: 1 },
      ];
    default:
      return null;
  }
}

export type IdLockHelpSection = {
  title: string;
  body: string;
};

export function idLockHelpSections(model: IdLockModel): IdLockHelpSection[] {
  const inclusion150 =
    "1. Ota Z-Wave-ohjain lisäystilaan.\n" +
    "2. Pidä avainpainiketta [A] kunnes näppäimistö aktivoituu — ovi auki ja lukko auki.\n" +
    "3. Päästä [A] ja syötä pää-PIN [1234], sitten [*].\n" +
    "4. Paina [2], sitten [*] (asetusvalikko).\n" +
    "5. Paina [5] lisäystä/poistoa varten.\n" +
    "Siniset LEDit vilkkuvat.";

  const inclusion101 =
    "1. Ota Z-Wave-ohjain lisäystilaan.\n" +
    "2. Pidä [A] kunnes näppäimistö aktivoituu — ovi auki ja lukko auki.\n" +
    "3. Päästä [A] ja paina [8].\n" +
    "Siniset LEDit vilkkuvat.";

  const reset150 =
    "Sama kuin lisäys, mutta vaiheessa 5 paina [0] (ei [5]).\n" +
    "Varoitus: jos moduuli on verkossa, tehdasasetukset palautuvat.\n" +
    "Resetin jälkeen laite on ehkä poistettava verkosta ennen uutta lisäystä.";

  const reset101 =
    "Sama kuin lisäys, mutta paina [0] numeron [8] sijaan.";

  return [
    {
      title: "Z-Wave-lisäys ja poisto",
      body: model === "150" ? inclusion150 : inclusion101,
    },
    {
      title: "Z-Wave-paikallinen nollaus",
      body: model === "150" ? reset150 : reset101,
    },
    {
      title: "Tärkeää ennen moduulin asennusta",
      body:
        "Poista paristot ennen Z-Wave-moduulin asentamista tai irrottamista.\n" +
        "Moduuli asennetaan paristojen alle merkintään „Remote control”.",
    },
    {
      title: "Käyttäjäkoodit (PIN ja RFID)",
      body:
        "ID Lock 150: enintään 25 käyttäjä-PINiä, 25 RFID-avainta, 1 huolto-PIN ja 1 pää-PIN.\n" +
        "Z-Wave-indeksit 1–25 = käyttäjä-PINit, 26–51 = RFID, 108 = huolto-PIN, 109 = pää-PIN.\n" +
        "Kaikkien koodien poisto palauttaa pää-PINin arvoon 1234.",
    },
    {
      title: "Akku",
      body:
        "Akun taso raportoidaan 0–100 % tai matalan akun varoituksena (0xFF).\n" +
        "Taso päivittyy yleensä avauksen jälkeen — raportissa voi olla lyhyt viive.",
    },
    {
      title: "Hälytykset ja tapahtumat",
      body:
        "• Manuaalinen lukitus / avaus (peukalo, avainpainike)\n" +
        "• Z-Wave-etälukitus ja -avaus\n" +
        "• Näppäimistön lukitus ja PIN-avaus\n" +
        "• Automaattilukitus ja ReLock\n" +
        "• Lukko jumissa (epäonnistunut lukitus/avaus)\n" +
        "• Koodien lisäys ja poisto\n" +
        "• Väärä PIN tai RFID\n" +
        "• Murtohälytys (pakotettu ovi) — poista syöttämällä kelvollinen PIN ja #\n" +
        "• Palohälytys (lämpöanturi lukossa) — poista samalla tavalla",
    },
    {
      title: "Sanasto",
      body:
        "Lisäys = laitteen liittäminen Z-Wave-verkkoon.\n" +
        "Poisto = laitteen poistaminen verkosta.\n" +
        "Lukittu / turvattu (Secured) = ovi lukossa.\n" +
        "Auki / turvaamaton (Unsecured) = ovi auki tai lukitus pois.",
    },
    {
      title: "Firmware",
      body:
        "Z-Wave-moduuli FW 1.6. ID Lock 150 -lukon firmware päivitetään ID Lock 150 Updater -sovelluksella (idlock.no/updater).\n" +
        "Z-Wave-moduuli vaatii turvallisuuden tukevan (S0) ohjaimen täyteen toimintaan.",
    },
  ];
}

export function formatIdLockModelType(value: unknown): string | null {
  if (value === 65 || value === 101) return "ID Lock 101";
  if (value === 96 || value === 150) return "ID Lock 150";
  return null;
}
