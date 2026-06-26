"use client";

import { DeviceReadingRow } from "@/components/device-reading-row";
import type { ResolvedDeviceReading } from "@/lib/device-reading-metrics";

type Props = {
  deviceId: string;
  readings: ResolvedDeviceReading[];
  onRenamed?: () => void;
  onShowTrend: (metric: string) => void;
  className?: string;
  showRename?: boolean;
};

export function DeviceReadingsList({
  deviceId,
  readings,
  onRenamed,
  onShowTrend,
  className = "mt-3 space-y-3 text-sm text-stone-700",
  showRename = true,
}: Props) {
  if (readings.length === 0) return null;

  return (
    <ul className={className}>
      {readings.map((row) => (
        <DeviceReadingRow
          key={row.metric}
          deviceId={deviceId}
          itemKey={row.itemKey ?? row.metric}
          label={row.label}
          value={row.value}
          onRenamed={onRenamed ?? (() => {})}
          onShowTrend={() => onShowTrend(row.metric)}
          showRename={showRename && !!row.itemKey}
        />
      ))}
    </ul>
  );
}
