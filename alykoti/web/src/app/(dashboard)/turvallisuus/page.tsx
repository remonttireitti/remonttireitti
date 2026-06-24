import { RoleDevicesPanel } from "@/components/role-devices-panel";

export default function TurvallisuusPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <RoleDevicesPanel
        pageTitle="Turvallisuus"
        pageDescription="Palohälyttimet, vuotoilmaisimet, liiketunnistimet ja ikkuna/ovikytkimet. Lämpötila-anturilla varustetut näkyvät myös Lämmitys-sivulla."
        sections={[
          {
            title: "Palohälyttimet",
            roles: ["fire_alarm"],
            sensorMode: true,
            empty: "Ei palohälyttimiä — valitse laitetyyppi Asetuksissa.",
          },
          {
            title: "Vuotoilmaisimet",
            roles: ["leak_detector"],
            sensorMode: true,
            empty: "Ei vuotoilmaisimia.",
          },
          {
            title: "Liiketunnistimet",
            roles: ["motion"],
            sensorMode: true,
            empty: "Ei liiketunnistimia.",
          },
          {
            title: "Ikkuna- ja ovikytkimet",
            roles: ["contact"],
            sensorMode: true,
            empty: "Ei ikkuna/ovikytkimiä.",
          },
        ]}
      />
    </div>
  );
}
