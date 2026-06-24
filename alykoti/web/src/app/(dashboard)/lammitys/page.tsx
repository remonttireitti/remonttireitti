import { HeatingPanel } from "@/components/heating-panel";
import { RoleDevicesPanel } from "@/components/role-devices-panel";

export default function HeatingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HeatingPanel />
      <RoleDevicesPanel
        pageTitle="Lämpötila turvallisuuslaitteista"
        pageDescription="Ikkuna-, ovi- ja liiketunnistimien lämpötilaa voi käyttää termostaateissa — laite pysyy Turvallisuus-sivulla."
        sections={[
          {
            title: "Turvallisuuslaitteiden lämpötilat",
            secondaryUse: "heating_temperature",
            sensorMode: true,
            readOnlyHint: "Valittavissa termostaatin anturiksi",
            empty: "Ei turvallisuuslaitteita, joissa on lämpötila-anturi.",
          },
        ]}
      />
      <RoleDevicesPanel
        pageTitle="Manuaalinen ohjaus"
        pageDescription="Suora päälle/pois-ohjaus lämmityslaitteille ilman termostaattia."
        sections={[
          {
            title: "Lämmityksen ohjaus",
            roles: ["heating"],
            empty: "Ei lämmityslaitteita — valitse laitteelle tyyppi Lämmitys Asetuksissa.",
          },
          {
            title: "Muu ohjaus",
            roles: ["other_control"],
            empty: "Ei muita ohjauksia — Shelly, Tasmota ja implantit kuuluvat tähän oletuksena.",
          },
        ]}
      />
    </div>
  );
}
