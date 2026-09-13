/** Staattinen SVG — tavallinen img, ei Next/Image (luotettavampi Cloudflaressa). */
export function HomeHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-lg shadow-violet-100/40 ring-1 ring-violet-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/ohjattu-tarjouspyynto-lomake.svg"
          alt="Ohjattu tarjouspyyntö: vaiheittainen ohje vasemmalla, kuvaus ja laatupiste oikealla"
          title="Ohjattu tarjouspyyntö"
          width={800}
          height={520}
          loading="eager"
          decoding="async"
          className="h-auto w-full"
        />
      </div>
      <p className="mt-3 text-center text-xs text-stone-500 lg:text-left">
        Valitse kohta → teksti lisätään kuvaukseen → laatupiste päivittyy
      </p>
    </div>
  );
}
