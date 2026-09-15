import Link from "next/link";

const demos = [
  {
    href: "/mainos/asiakas",
    title: "Asiakkaalle",
    desc: "Mikä on Remonttireitti — kilpailuta remontti ilmaiseksi.",
  },
  {
    href: "/mainos/urakoitsija",
    title: "Urakoitsijalle",
    desc: "Miksi liittyä — tarjouspyynnöt suoraan eteesi.",
  },
] as const;

export default function AdDemoHubPage() {
  return (
    <div className="min-h-screen bg-stone-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
          Mainosdemot
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          30 sekunnin animoidut videot
        </h1>
        <p className="mt-4 text-stone-300">
          Avaa demo, valitse formaatti ja tallenna ruudulta 30 sekuntia. Käytä{" "}
          <code className="rounded bg-stone-800 px-1.5 py-0.5 text-sky-300">
            ?chrome=0
          </code>{" "}
          piilottaaksesi etenemisindikaattorin tallennuksessa.
        </p>

        <div className="mt-10 space-y-6">
          {demos.map((demo) => (
            <section
              key={demo.href}
              className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6"
            >
              <h2 className="text-xl font-semibold">{demo.title}</h2>
              <p className="mt-2 text-sm text-stone-400">{demo.desc}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`${demo.href}?formaatti=pysty`}
                  className="rounded-full bg-orange-700 px-5 py-2.5 text-sm font-semibold hover:bg-orange-600"
                >
                  Pysty 9:16 (Some)
                </Link>
                <Link
                  href={`${demo.href}?formaatti=vaaka`}
                  className="rounded-full border border-stone-600 px-5 py-2.5 text-sm font-semibold hover:bg-stone-800"
                >
                  Vaaka 16:9 (YouTube)
                </Link>
                <Link
                  href={`${demo.href}?formaatti=pysty&chrome=0`}
                  className="rounded-full border border-sky-700/60 px-5 py-2.5 text-sm text-sky-300 hover:bg-sky-950"
                >
                  Tallennusversio (pysty)
                </Link>
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-xs text-stone-500">
          Demot pyörivät automaattisesti 30 sekuntia (6 kohtausta × 5 s) ja
          alkavat alusta uudelleen.
        </p>
      </div>
    </div>
  );
}
