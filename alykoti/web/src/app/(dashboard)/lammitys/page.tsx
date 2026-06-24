import { HeatingPanel } from "@/components/heating-panel";
import { RoleDevicesPanel } from "@/components/role-devices-panel";

export default function HeatingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HeatingPanel />
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
