const items = [
  {
    title: "Koko kodin palvelut",
    body: "Remontti keväällä, lumityö talvella, vian selvitys kun laite oireilee, tori kun myyt vanhan laitteen — sama palvelu, eri tilanteet.",
    highlight: true,
  },
  {
    title: "Tingaa hintaa",
    body: "Etkö hyväksy tarjousta? Ehdota alhaisempaa vastatarjouksella — urakoitsija voi hyväksyä, hylätä tai jättää uuden tarjouksen.",
    highlight: false,
  },
  {
    title: "Kertyy arvoa ajan myötä",
    body: "Arvostelut, huoltokirja ja aiemmat urakat auttavat seuraavassa valinnassa. Mitä enemmän käytät, sitä hyödyllisempi palvelu muuttuu.",
    highlight: false,
  },
  {
    title: "Vertailukelpoiset tarjoukset",
    body: "Useita tarjouksia samassa muodossa: laajuus, hinta, takuu ja aikataulu. Asiakkaalle palvelu on ilmainen.",
    highlight: false,
  },
  {
    title: "Sinulle ilmainen",
    body: "Pyyntö, vertailu ja vastatarjoukset eivät maksa mitään. Urakoitsija maksaa palvelun välityspalkkion vasta, kun hyväksyt hänen tarjouksensa.",
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
              ? "rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm ring-1 ring-sky-100"
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
