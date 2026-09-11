const items = [
  {
    title: "Tingaa hintaa",
    body: "Etkö hyväksy tarjousta? Ehdota alhaisempaa vastatarjouksella — urakoitsija voi hyväksyä, hylätä tai jättää uuden tarjouksen. Tämä erottaa Remonttireitin perinteisistä kilpailutuspalveluista.",
    highlight: true,
  },
  {
    title: "Vertailukelpoiset tarjoukset",
    body: "Useita tarjouksia samassa muodossa: laajuus, hinta, takuu ja aikataulu. Näet arvostelut ja voit valita rauhassa.",
    highlight: false,
  },
  {
    title: "Valmiit tarjouspyynnöt",
    body: "Asiakas kuvaa kohteen ja liittää kuvat — urakoitsija voi tarjota tarkasti ilman turhia kierroksia. Lämpöpumpuissa tarkempi lomake.",
    highlight: false,
  },
  {
    title: "Sinulle ilmainen",
    body: "Pyyntö, vertailu ja vastatarjoukset eivät maksa mitään. Urakoitsija maksaa palvelun välityspalkkion vasta, kun hyväksyt hänen tarjouksensa.",
    highlight: false,
  },
  {
    title: "Kertyy arvoa ajan myötä",
    body: "Arvostelut, huoltokirja ja hinta-arkisto auttavat seuraavassa valinnassa. Mitä enemmän käytät, sitä hyödyllisempi palvelu muuttuu.",
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
              ? "rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm ring-1 ring-violet-100 sm:col-span-2"
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
