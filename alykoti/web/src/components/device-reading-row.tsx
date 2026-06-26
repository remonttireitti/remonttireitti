"use client";

import { ItemRenameField } from "@/components/item-rename-field";
import { TrendTrigger } from "@/components/trend-trigger";

type Props = {
  deviceId: string;
  itemKey: string;
  label: string;
  value: string;
  onRenamed: () => void;
  onShowTrend?: () => void;
  showRename?: boolean;
};

export function DeviceReadingRow({
  deviceId,
  itemKey,
  label,
  value,
  onRenamed,
  onShowTrend,
  showRename = true,
}: Props) {
  return (
    <li className="flex justify-between gap-4">
      {showRename ? (
        <ItemRenameField
          deviceId={deviceId}
          itemKey={itemKey}
          currentName={label}
          onRenamed={onRenamed}
        />
      ) : (
        <span className="text-stone-700">{label}</span>
      )}
      <span className="flex shrink-0 items-center gap-1 font-medium">
        {onShowTrend ? (
          <button
            type="button"
            onClick={onShowTrend}
            className="rounded-md px-1 tabular-nums text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-600"
            title="Näytä trendi"
          >
            {value}
          </button>
        ) : (
          <span className="tabular-nums">{value}</span>
        )}
        {onShowTrend && <TrendTrigger onClick={onShowTrend} />}
      </span>
    </li>
  );
}
