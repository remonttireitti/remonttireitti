"use client";

import { useState } from "react";
import { renameDeviceDisplayName, renameDeviceItem } from "@/app/actions/devices";

type Props = {
  deviceId: string;
  itemKey: string;
  currentName: string;
  placeholder?: string;
  className?: string;
  onRenamed?: (name: string) => void;
  /** item = item_names (kanava/endpoint), display = device_overrides.display_name */
  mode?: "item" | "display";
};

export function ItemRenameField({
  deviceId,
  itemKey,
  currentName,
  placeholder = "Nimi",
  className = "",
  onRenamed,
  mode = "item",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="font-medium text-stone-900">{currentName}</span>
        <button
          type="button"
          onClick={() => {
            setDraft(currentName);
            setError(null);
            setEditing(true);
          }}
          className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 hover:bg-stone-50"
          title="Nimeä uudelleen"
        >
          Nimeä
        </button>
      </div>
    );
  }

  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        void (mode === "display"
          ? renameDeviceDisplayName(deviceId, draft)
          : renameDeviceItem(deviceId, itemKey, draft)
        ).then((res) => {
          setBusy(false);
          if (res.error) {
            setError(res.error);
            return;
          }
          setEditing(false);
          onRenamed?.(draft.trim() || currentName);
        });
      }}
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="min-w-[8rem] rounded-lg border border-stone-200 px-2 py-1 text-sm"
        disabled={busy}
        autoFocus
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        OK
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setEditing(false)}
        className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
      >
        Peru
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
