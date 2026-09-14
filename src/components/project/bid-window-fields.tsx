import {
  BID_WINDOW_DAY_OPTIONS,
  PROJECT_BID_WINDOW_DAYS,
} from "@/lib/project-inactivity";
import { formInputClass } from "@/lib/brand-theme";

export function BidWindowFields({
  value,
  onChange,
  id = "bid_window_days",
  className = formInputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        Tarjousaika *
      </label>
      <p className="mt-1 text-xs text-stone-600">
        Kuinka kauan otat tarjouksia vastaan julkaisusta? Voit sulkea pyynnön tai
        valita tarjouksen myös aiemmin.
      </p>
      <select
        id={id}
        name="bid_window_days"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} mt-2`}
      >
        {BID_WINDOW_DAY_OPTIONS.map((days) => (
          <option key={days} value={String(days)}>
            {days} päivää
            {days === PROJECT_BID_WINDOW_DAYS ? " (suositus)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
