"use client";

import { useCallback, useState } from "react";

type Props = {
  url: string;
  title?: string;
  text?: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  compact?: boolean;
};

export function ShareLinkButton({
  url,
  title,
  text,
  label = "Jaa linkki",
  copiedLabel = "Linkki kopioitu!",
  className = "",
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyLink = useCallback(async () => {
    setError(null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          url,
          title: title ?? "Remonttireitti",
          text: text ?? title,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        setError("Kopiointi epäonnistui");
      }
    }
  }, [url, title, text]);

  const buttonClass = compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
    : "inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50";

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button type="button" onClick={copyLink} className={buttonClass}>
        <span aria-hidden>{copied ? "✓" : "🔗"}</span>
        {copied ? copiedLabel : label}
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
