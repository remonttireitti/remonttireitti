const items = [
  {
    title: "Ohjattu tarjouspyyntö",
    body: "Vaiheittainen ohje ja laatupiste — selkeä kuvaus ilman arvailua.",
    highlight: true,
  },
  {
    title: "Oppiva pohja",
    body: "Muistaa mitä urakoitsijat pyytävät tarkentamaan — seuraava pyyntö on valmiimpi.",
    highlight: false,
  },
  {
    title: "Vertailukelpoiset tarjoukset",
    body: "Hinta, laajuus, takuu ja aikataulu samassa muodossa. Tingaa vastatarjouksella.",
    highlight: false,
  },
  {
    title: "Sinulle ilmainen",
    body: "Pyyntö, vertailu ja Tarjousvahti maksavat 0 €.",
    highlight: false,
  },
] as const;

export function HomeDifferentiators() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      {items.map((item) => (
        <div
          key={item.title}
          className={
            item.highlight
              ? "rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm ring-1 ring-violet-100 sm:col-span-2"
              : "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          }
        >
          <h3 className="font-semibold text-stone-900">{item.title}</h3>
          <p className="mt-1.5 text-sm text-stone-600">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
