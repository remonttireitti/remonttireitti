"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  updateContractorServiceArea,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { brand, formInputClass } from "@/lib/brand-theme";

type Props = {
  servicePostalCode: string;
  serviceMunicipality: string;
  maxTravelKm: number;
  className?: string;
};

export function ContractorServiceAreaForm({
  servicePostalCode,
  serviceMunicipality,
  maxTravelKm,
  className = "",
}: Props) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorServiceArea, {});

  return (
    <form
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Toimipaikka ja matkustus</h2>
      <p className={brand.sectionDesc}>
        Näytämme oletuksena tarjouspyynnöt omalta alueeltasi (enintään valitsemasi
        etäisyyden päästä). Voit aina selata kaikkia pyyntöjä listasta.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="service_postal_code" className="block text-sm font-medium">
            Postinumero
          </label>
          <input
            id="service_postal_code"
            name="service_postal_code"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            placeholder="00100"
            defaultValue={servicePostalCode}
            className={formInputClass}
          />
        </div>
        <div>
          <label htmlFor="service_municipality" className="block text-sm font-medium">
            Kunta
          </label>
          <input
            id="service_municipality"
            name="service_municipality"
            type="text"
            placeholder="Helsinki"
            defaultValue={serviceMunicipality}
            className={formInputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="max_travel_km" className="block text-sm font-medium">
          Matkustus enintään (km)
        </label>
        <input
          id="max_travel_km"
          name="max_travel_km"
          type="number"
          min={10}
          max={500}
          step={10}
          defaultValue={maxTravelKm}
          className={`${formInputClass} max-w-[8rem]`}
        />
        <p className="mt-1 text-xs text-stone-500">
          Oletus 100 km. Etäisyys lasketaan postinumeroista tai kunnasta.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-sky-800" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Tallennetaan…" : "Tallenna toimipaikka"}
      </button>
    </form>
  );
}

export function ContractorProjectFilterBar({
  showAll,
  recommendedCount,
  totalCount,
  locationConfigured,
  maxTravelKm,
}: {
  showAll: boolean;
  recommendedCount: number;
  totalCount: number;
  locationConfigured: boolean;
  maxTravelKm: number;
}) {
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/tarjoukset"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !showAll
              ? "bg-sky-700 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Oma alue ({recommendedCount})
        </Link>
        <Link
          href="/tarjoukset?nayta=kaikki"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            showAll
              ? "bg-sky-700 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          Kaikki ({totalCount})
        </Link>
      </div>
      <p className="text-xs leading-relaxed text-stone-600">
        {!locationConfigured ? (
          <>
            Määritä{" "}
            <Link href="/oma-tili" className="font-medium text-sky-800 hover:underline">
              toimipaikka Oma tilissä
            </Link>{" "}
            rajataksesi etäisyyden.
          </>
        ) : (
          <>Näytetään oletuksena oman ammatin pyynnöt enintään {maxTravelKm} km päästä.</>
        )}{" "}
        Pätevyysmerkinnät ovat suosituksia — voit avata pyynnön myös ilman täyttä
        pätevyyttä.
      </p>
    </div>
  );
}

export function ProjectMatchBadges({
  match,
}: {
  match: {
    tradeMatch: boolean;
    jobTypeMatch: boolean;
    qualificationFit: string;
    qualificationGaps: { label: string; severity: string }[];
    distanceKm: number | null;
    withinRange: boolean;
  };
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {match.tradeMatch ? (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
          Oma ammatti
        </span>
      ) : (
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          Muu ammatti
        </span>
      )}
      {match.jobTypeMatch && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
          Valitsemasi työlaji
        </span>
      )}
      {match.distanceKm != null && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            match.withinRange
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          ~{match.distanceKm} km
        </span>
      )}
      {match.qualificationFit === "full" && (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
          Pätevyys OK
        </span>
      )}
      {match.qualificationFit === "partial" &&
        match.qualificationGaps.map((g) => (
          <span
            key={g.label}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
          >
            {g.label}
          </span>
        ))}
      {match.qualificationFit === "none" &&
        match.qualificationGaps.slice(0, 2).map((g) => (
          <span
            key={g.label}
            className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800"
          >
            Puuttuu: {g.label}
          </span>
        ))}
    </div>
  );
}
