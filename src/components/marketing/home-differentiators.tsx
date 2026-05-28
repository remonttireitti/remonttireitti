const items = [
  {
    title: "Tingaa hintaa",
    body: "Etkö hyväksy tarjousta? Ehdota alhaisempaa vastatarjouksella — urakoitsija voi hyväksyä, hylätä tai jättää uuden tarjouksen.",
    highlight: true,
  },
  {
    title: "Tarkka tarjouspyyntö",
    body: "Lomake on rakennettu lämpöpumppuille: asennuspaikka, putket, kuvat, ilmastovyöhyke ja laitteen tiedot. Urakoitsija voi laskea tarjouksen tarkemmin ilman yllätyksiä.",
    highlight: false,
  },
  {
    title: "Vertailukelpoiset tarjoukset",
    body: "Useita tarjouksia samassa muodossa: laite, työ, takuu ja aikataulu. Asiakkaalle palvelu on ilmainen.",
    highlight: false,
  },
  {
    title: "Sinulle ilmainen",
    body: "Pyyntö, vertailu ja vastatarjoukset eivät maksa mitään. Urakoitsija maksaa palvelun välityspalkkion vasta, kun hyväksyt hänen tarjouksensa — ei sinua.",
    highlight: false,
  },
  {
    title: "Palaute valmiista urakasta",
    body: "Kun merkitset urakan valmiiksi, voit arvostella urakoitsijan. Muistutus tulee myös noin viikon kuluttua — kerro miten homma sujui.",
    highlight: false,
  },
] as const;

export function HomeDifferentiators() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      {items.map((item) => (
        <div
          key={item.title}
          className={
            item.highlight
              ? "rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm ring-1 ring-orange-100"
              : "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          }
        >
          <h3 className="font-semibold text-stone-900">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}
